"use client";

import * as React from "react";
import { SiteNav } from "@/components/site-nav";
import {
  PenSquare,
  MessageCircle,
  Heart,
  Eye,
  X,
} from "lucide-react";

interface Post {
  id: number;
  author: string;
  time: string;
  category: "guide" | "discussion" | "video" | "fanart";
  categoryLabel: string;
  title: string;
  excerpt: string;
  comments: number;
  likes: number;
  views: string;
}

const posts: Post[] = [
  {
    id: 1, author: "攻略大师", time: "2小时前", category: "guide", categoryLabel: "攻略",
    title: "剑圣排位上分攻略：核心出装与对线思路",
    excerpt: "详细分析剑圣在当前版本的强势出装路线，包括核心装备选择、符文搭配和对线思路分享。",
    comments: 24, likes: 128, views: "1.2k",
  },
  {
    id: 2, author: "暗夜精灵", time: "5小时前", category: "discussion", categoryLabel: "讨论",
    title: "新赛季段位重置规则解读",
    excerpt: "官方发布了新赛季的段位重置机制，本文详细解读重置规则和对玩家的影响。",
    comments: 15, likes: 89, views: "856",
  },
  {
    id: 3, author: "风行者", time: "昨天", category: "guide", categoryLabel: "攻略",
    title: "排位赛BP思路分享",
    excerpt: "分享一些高段位排位赛中的选人策略，如何根据阵容和对手选择最优英雄。",
    comments: 42, likes: 256, views: "2.1k",
  },
  {
    id: 4, author: "烈焰战神", time: "昨天", category: "discussion", categoryLabel: "讨论",
    title: "新角色「冰霜女王」实战评测",
    excerpt: "花了两天时间测试新角色的强度和定位，从技能机制到实战表现全面评测。",
    comments: 67, likes: 342, views: "3.5k",
  },
  {
    id: 5, author: "圣光骑士", time: "2天前", category: "guide", categoryLabel: "攻略",
    title: "公会战攻略：阵容搭配推荐",
    excerpt: "总结了一下公会战中比较强势的阵容组合，附带详细的站位和打法说明。",
    comments: 31, likes: 178, views: "1.4k",
  },
  {
    id: 6, author: "影刃", time: "3天前", category: "guide", categoryLabel: "攻略",
    title: "从白金到王者的进阶之路",
    excerpt: "分享一下我从白金一路打到王者的心得，包括心态调整和关键操作技巧。",
    comments: 93, likes: 512, views: "5.2k",
  },
];

const categories = [
  { key: "all", label: "全部" },
  { key: "guide", label: "攻略" },
  { key: "discussion", label: "讨论" },
  { key: "video", label: "视频" },
  { key: "fanart", label: "同人" },
] as const;

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(post.likes);
  const likeRef = React.useRef<HTMLButtonElement>(null);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    if (likeRef.current) {
      likeRef.current.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
      );
    }
  };

  return (
    <div
      onClick={() => alert(`打开帖子：${post.title}`)}
      className="bg-card border border-border rounded-md overflow-hidden card-hover cursor-pointer"
    >
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-secondary" />
          <span className="text-xs text-card-foreground font-medium">{post.author}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{post.time}</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            {post.categoryLabel}
          </span>
        </div>
        <h3 className="text-sm text-card-foreground font-medium mb-2 truncate">{post.title}</h3>
        <p
          className="text-xs text-muted-foreground"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {post.excerpt}
        </p>
      </div>
      <div className="border-t border-border px-5 py-3 flex items-center gap-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="size-3" />
          {post.comments}
        </span>
        <button
          ref={likeRef}
          onClick={handleLike}
          className="flex items-center gap-1 text-xs transition-colors cursor-pointer"
          style={{ color: liked ? "rgb(255,100,103)" : undefined }}
        >
          <Heart
            className="size-3"
            style={{ fill: liked ? "currentColor" : "none" }}
          />
          {likeCount}
        </button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Eye className="size-3" />
          {post.views}
        </span>
      </div>
    </div>
  );
}

function PublishModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("guide");

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("请输入标题");
      return;
    }
    alert("帖子发布成功！");
    onClose();
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-card-foreground">发布帖子</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/50"
          />
          <textarea
            placeholder="内容..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/50"
            style={{ resize: "vertical" }}
          />
          <div className="flex gap-2 flex-wrap">
            {categories.slice(1).map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`tab-btn ${category === cat.key ? "active" : ""}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition-opacity mt-2"
          >
            发布
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [showModal, setShowModal] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const filteredPosts = React.useMemo(() => {
    if (activeCategory === "all") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => setLoadingMore(false), 1500);
  };

  return (
    <main className="w-screen min-h-screen page-enter">
      <SiteNav />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* 标题 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 fade-in">
          <h1 className="font-serif text-2xl text-card-foreground">社区</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <PenSquare className="size-3.5" />
            发布帖子
          </button>
        </div>

        {/* 分类 Tab */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar fade-in" style={{ animationDelay: "0.1s" }}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`tab-btn shrink-0 ${activeCategory === cat.key ? "active" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 帖子网格 */}
        <div key={activeCategory} className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* 加载更多 */}
        <div className="flex justify-center mt-6 fade-in" style={{ animationDelay: "0.4s" }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 text-xs border border-border bg-card text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loadingMore ? "加载中..." : "加载更多"}
          </button>
        </div>
      </div>

      {/* 发布帖子弹窗 */}
      {showModal && <PublishModal onClose={() => setShowModal(false)} />}
    </main>
  );
}
