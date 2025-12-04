import enum
from datetime import datetime
from sqlalchemy import (
    CheckConstraint,
    UniqueConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Column,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    USER = "user"
    RESEARCHER = "researcher"
    MODERATOR = "moderator"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class VotableMixin:
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


post_tags = Table(
    "post_tags",
    Base.metadata,
    Column(
        "post_id",
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    password_salt: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        default=UserRole.USER,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(unique=True, index=True)
    is_email_verified: Mapped[bool] = mapped_column(
        default=False, nullable=False)
    social_links: Mapped[str | None] = mapped_column()
    authored_posts: Mapped[list["Post"]] = relationship(
        back_populates="poster",
        cascade="all, delete-orphan",
    )
    authored_comments: Mapped[list["Comment"]] = relationship(
        back_populates="commenter",
        cascade="all, delete-orphan",
    )
    authored_reviews: Mapped[list["Review"]] = relationship(
        back_populates="reviewer",
        cascade="all, delete-orphan",
    )
    filed_reports: Mapped[list["Report"]] = relationship(
        back_populates="reported_by",
        cascade="all, delete-orphan",
    )
    post_votes: Mapped[list["PostVote"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    comment_votes: Mapped[list["CommentVote"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Tag(TimestampMixin, Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, index=True)
    posts: Mapped[list["Post"]] = relationship(
        secondary=post_tags,
        back_populates="tags",
    )


class PostPhase(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Post(TimestampMixin, VotableMixin, Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    poster_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(nullable=False, index=True)
    authors_text: Mapped[str] = mapped_column(nullable=False)
    abstract: Mapped[str] = mapped_column(nullable=False)
    bibtex: Mapped[str | None] = mapped_column(nullable=True)
    body: Mapped[str] = mapped_column(nullable=False)
    phase: Mapped[PostPhase] = mapped_column(
        Enum(PostPhase, name="post_phase", native_enum=False),
        default=PostPhase.DRAFT,
        nullable=False,
        index=True,
    )
    poster: Mapped[User] = relationship(back_populates="authored_posts")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list[Tag]] = relationship(
        secondary=post_tags,
        back_populates="posts",
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    post_votes: Mapped[list["PostVote"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Comment(TimestampMixin, VotableMixin, Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_comment_id: Mapped[int | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
    )
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    commenter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(nullable=False)
    post: Mapped[Post] = relationship(back_populates="comments")
    commenter: Mapped[User] = relationship(back_populates="authored_comments")
    comment_votes: Mapped[list["CommentVote"]] = relationship(
        back_populates="comment",
        cascade="all, delete-orphan",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Attachment(TimestampMixin, Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    post: Mapped[Post] = relationship(back_populates="attachments")


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_positive: Mapped[bool] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
    post: Mapped[Post] = relationship(back_populates="reviews")
    reviewer: Mapped[User] = relationship(back_populates="authored_reviews")


class Report(TimestampMixin, Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reported_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(
        nullable=False,
        doc="'post', 'comment', 'user'",
    )
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status", native_enum=False),
        default=ReportStatus.PENDING,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reported_by: Mapped[User] = relationship(
        back_populates="filed_reports",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PostVote(TimestampMixin, Base):
    __tablename__ = "post_votes"
    __table_args__ = (
        CheckConstraint("value in (-1, 1)", name="post_vote_value_check"),
        UniqueConstraint("user_id", "post_id", name="uq_post_vote")
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(nullable=False)
    user: Mapped[User] = relationship(back_populates="post_votes")
    post: Mapped[Post] = relationship(back_populates="post_votes")


class CommentVote(TimestampMixin, Base):
    __tablename__ = "comment_votes"
    __table_args__ = (
        CheckConstraint("value in (-1, 1)", name="comment_vote_value_check"),
        UniqueConstraint("user_id", "comment_id", name="uq_comment_vote")
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    comment_id: Mapped[int] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    user: Mapped[User] = relationship(back_populates="comment_votes")
    comment: Mapped[Comment] = relationship(back_populates="comment_votes")
