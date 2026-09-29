// src/pages/Profile.jsx — own profile (owner controls).
// The shared system lives in components/profile/ProfilePage.jsx; `isOwn`
// adds the owner layer: edit profile, settings link, share, completion
// prompt and the 12-week activity heatmap.
import ProfilePage from '../components/profile/ProfilePage';

export default function Profile() {
  return <ProfilePage isOwn />;
}
