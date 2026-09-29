// src/components/social/UserCard.jsx
// Reusable user row: avatar, name, follow state, mutual context. Used by the
// follow lists, the community suggestions rail and profile cards.

import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import FollowButton from './FollowButton';
import styles from './social.module.css';

export default function UserCard({
  user, myId, isFollowing = false, followsMe = false,
  size = 'md', onCountChange, onStateChange, actions = null,
}) {
  if (!user?.id) return null;
  const isMe = user.id === myId;

  return (
    <div className={styles.userCard}>
      <Link to={`/user/${user.id}`} className={styles.userLink}>
        <Avatar src={user.photoURL} activeFrame={user.activeFrame} size={size === 'sm' ? 34 : 42} alt={user.displayName} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className={styles.userName}>{user.displayName || 'EcoUser'}</p>
          <p className={styles.userMeta}>
            {user.username && <span className={styles.userHandle}>@{user.username}</span>}
            {user.role === 'teacher' || user.role === 'admin' || user.role === 'owner' ? (
              <span className={styles.followsYou}>{user.role === 'owner' ? 'Owner' : 'Staff'}</span>
            ) : null}
            {followsMe && !isMe && <span className={styles.followsYou}>Follows you</span>}
            {user.followersCount > 0 && <span>{user.followersCount} followers</span>}
          </p>
        </div>
      </Link>
      {!isMe && (
        <FollowButton
          targetUid={user.id}
          initialFollowing={isFollowing}
          initialFollowsMe={followsMe}
          size={size === 'sm' ? 'sm' : 'md'}
          onCountChange={onCountChange}
          onStateChange={onStateChange}
        />
      )}
      {actions}
    </div>
  );
}
