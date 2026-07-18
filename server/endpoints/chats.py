from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from server.storage import acquire_db_session
from server.injectors import fetch_authenticated_user
from server.entities import DBConversation, DBListing, DBListingPhoto, DBMessage, DBUser
from server.payloads import PayloadConversationCreate, PayloadConversationOut, PayloadHostConversationCreate, PayloadMessageCreate, PayloadMessageOut

chat_router = APIRouter(prefix="/messages", tags=["messages"])


def _retrieve_listing_photo_url(db_session: Session, target_listing_id: int) -> str | None:
    photo_record = (
        db_session.query(DBListingPhoto)
        .filter(DBListingPhoto.listing_id == target_listing_id)
        .order_by(DBListingPhoto.sort_order)
        .first()
    )
    return photo_record.url if photo_record else None


def _format_conversation_output(conv_obj: DBConversation, auth_user: DBUser, db_session: Session) -> PayloadConversationOut:
    last_msg = max(conv_obj.messages, key=lambda m: m.created_at) if conv_obj.messages else None
    unread_msgs_count = (
        db_session.query(func.count(DBMessage.id))
        .filter(
            DBMessage.conversation_id == conv_obj.id,
            DBMessage.sender_id != auth_user.id,
            DBMessage.read_at.is_(None),
        )
        .scalar()
        or 0
    )
    recipient_user = conv_obj.host if auth_user.id == conv_obj.guest_id else conv_obj.guest
    return PayloadConversationOut(
        id=conv_obj.id,
        listing_id=conv_obj.listing_id,
        listing_title=conv_obj.listing.title,
        listing_photo=_retrieve_listing_photo_url(db_session, conv_obj.listing_id),
        other_user_name=recipient_user.name,
        other_user_id=recipient_user.id,
        last_message=last_msg.body if last_msg else None,
        last_message_at=last_msg.created_at if last_msg else conv_obj.updated_at,
        unread_count=unread_msgs_count,
    )


@chat_router.get("/conversations", response_model=list[PayloadConversationOut])
def get_my_conversations(auth_user: DBUser = Depends(fetch_authenticated_user), db_session: Session = Depends(acquire_db_session)):
    user_conversations = (
        db_session.query(DBConversation)
        .options(
            joinedload(DBConversation.listing),
            joinedload(DBConversation.guest),
            joinedload(DBConversation.host),
            joinedload(DBConversation.messages),
        )
        .filter(or_(DBConversation.guest_id == auth_user.id, DBConversation.host_id == auth_user.id))
        .order_by(DBConversation.updated_at.desc())
        .all()
    )
    return [_format_conversation_output(conv_item, auth_user, db_session) for conv_item in user_conversations]


@chat_router.post("/conversations", response_model=PayloadConversationOut, status_code=201)
def initialize_conversation(
    payload: PayloadConversationCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    listing_entity = db_session.query(DBListing).filter(DBListing.id == payload.listing_id).first()
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing_entity.host_id == auth_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself about your own listing")

    existing_conv = (
        db_session.query(DBConversation)
        .options(
            joinedload(DBConversation.listing),
            joinedload(DBConversation.guest),
            joinedload(DBConversation.host),
            joinedload(DBConversation.messages),
        )
        .filter(
            DBConversation.guest_id == auth_user.id,
            DBConversation.host_id == listing_entity.host_id,
            DBConversation.listing_id == listing_entity.id,
        )
        .first()
    )
    if existing_conv:
        return _format_conversation_output(existing_conv, auth_user, db_session)

    new_conv = DBConversation(guest_id=auth_user.id, host_id=listing_entity.host_id, listing_id=listing_entity.id)
    db_session.add(new_conv)
    db_session.commit()
    new_conv = (
        db_session.query(DBConversation)
        .options(
            joinedload(DBConversation.listing),
            joinedload(DBConversation.guest),
            joinedload(DBConversation.host),
            joinedload(DBConversation.messages),
        )
        .filter(DBConversation.id == new_conv.id)
        .first()
    )
    return _format_conversation_output(new_conv, auth_user, db_session)


@chat_router.post("/conversations/for-guest", response_model=PayloadConversationOut, status_code=201)
def initialize_host_conversation_with_guest(
    payload: PayloadHostConversationCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    listing_entity = db_session.query(DBListing).filter(DBListing.id == payload.listing_id).first()
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing_entity.host_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your listing")

    guest_user = db_session.query(DBUser).filter(DBUser.id == payload.guest_id).first()
    if not guest_user:
        raise HTTPException(status_code=404, detail="Guest not found")

    existing_conv = (
        db_session.query(DBConversation)
        .options(
            joinedload(DBConversation.listing),
            joinedload(DBConversation.guest),
            joinedload(DBConversation.host),
            joinedload(DBConversation.messages),
        )
        .filter(
            DBConversation.guest_id == payload.guest_id,
            DBConversation.host_id == auth_user.id,
            DBConversation.listing_id == listing_entity.id,
        )
        .first()
    )
    if existing_conv:
        return _format_conversation_output(existing_conv, auth_user, db_session)

    new_conv = DBConversation(
        guest_id=payload.guest_id,
        host_id=auth_user.id,
        listing_id=listing_entity.id,
    )
    db_session.add(new_conv)
    db_session.commit()
    new_conv = (
        db_session.query(DBConversation)
        .options(
            joinedload(DBConversation.listing),
            joinedload(DBConversation.guest),
            joinedload(DBConversation.host),
            joinedload(DBConversation.messages),
        )
        .filter(DBConversation.id == new_conv.id)
        .first()
    )
    return _format_conversation_output(new_conv, auth_user, db_session)


@chat_router.get("/conversations/{conversation_id}/messages", response_model=list[PayloadMessageOut])
def retrieve_conversation_messages(
    conversation_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    conversation_entity = db_session.query(DBConversation).filter(DBConversation.id == conversation_id).first()
    if not conversation_entity:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if auth_user.id not in (conversation_entity.guest_id, conversation_entity.host_id):
        raise HTTPException(status_code=403, detail="Not your conversation")

    db_session.query(DBMessage).filter(
        DBMessage.conversation_id == conversation_id,
        DBMessage.sender_id != auth_user.id,
        DBMessage.read_at.is_(None),
    ).update({DBMessage.read_at: datetime.utcnow()})
    db_session.commit()

    message_records = (
        db_session.query(DBMessage, DBUser.name)
        .join(DBUser, DBUser.id == DBMessage.sender_id)
        .filter(DBMessage.conversation_id == conversation_id)
        .order_by(DBMessage.created_at.asc())
        .all()
    )
    return [
        PayloadMessageOut(
            id=msg_obj.id,
            conversation_id=msg_obj.conversation_id,
            sender_id=msg_obj.sender_id,
            sender_name=sender_display_name,
            body=msg_obj.body,
            created_at=msg_obj.created_at,
            is_mine=msg_obj.sender_id == auth_user.id,
        )
        for msg_obj, sender_display_name in message_records
    ]


@chat_router.post("/conversations/{conversation_id}/messages", response_model=PayloadMessageOut, status_code=201)
def post_new_message(
    conversation_id: int,
    payload: PayloadMessageCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    conversation_entity = db_session.query(DBConversation).filter(DBConversation.id == conversation_id).first()
    if not conversation_entity:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if auth_user.id not in (conversation_entity.guest_id, conversation_entity.host_id):
        raise HTTPException(status_code=403, detail="Not your conversation")

    sanitized_body = payload.body.strip()
    if not sanitized_body:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    new_msg = DBMessage(conversation_id=conversation_id, sender_id=auth_user.id, body=sanitized_body)
    conversation_entity.updated_at = datetime.utcnow()
    db_session.add(new_msg)
    db_session.commit()
    db_session.refresh(new_msg)
    return PayloadMessageOut(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_id=new_msg.sender_id,
        sender_name=auth_user.name,
        body=new_msg.body,
        created_at=new_msg.created_at,
        is_mine=True,
    )
