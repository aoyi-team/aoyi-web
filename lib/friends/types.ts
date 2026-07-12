/**
 * 好友系统共享类型定义
 * 所有好友相关组件和 API 路由统一使用此处类型，避免字段不同步
 */

/** 用户基础资料（搜索结果、通知中的申请者） */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** 好友资料（含关系 ID 和在线状态） */
export interface FriendProfile extends UserProfile {
  friendship_id: string;
  is_online: boolean;
  last_seen: string | null;
}

/** 搜索结果（UserProfile + 在线状态） */
export interface SearchResult extends UserProfile {
  is_online: boolean;
}

/** 好友申请 */
export interface FriendRequest {
  friendship_id: string;
  requester_id: string;
  created_at: string;
  profile: UserProfile | null;
}
