from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_superuser, get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.user import PasswordChange, UserCreate, UserOut, UserUpdate
from app.services.activity_log_service import ActivityLogService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = await UserService(db).change_password(current_user, data.current_password, data.new_password)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.USER_UPDATED,
        entity_type=EntityType.USER,
        entity_id=current_user.id,
        details={"password_changed": True},
    )


@router.get("/", response_model=list[UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    return await UserService(db).get_all(skip=skip, limit=limit)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    service = UserService(db)
    if await service.get_by_email(data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if await service.get_by_username(data.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    user = await service.create(data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.USER_CREATED,
        entity_type=EntityType.USER,
        entity_id=user.id,
        details={"username": user.username, "email": user.email},
    )
    return user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    user = await UserService(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    changed_fields = list(data.model_dump(exclude_unset=True).keys())
    user = await service.update(user, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.USER_UPDATED,
        entity_type=EntityType.USER,
        entity_id=user.id,
        details={"changed_fields": changed_fields},
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself"
        )
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    username = user.username
    await service.delete(user)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.USER_DELETED,
        entity_type=EntityType.USER,
        entity_id=user_id,
        details={"username": username},
    )
