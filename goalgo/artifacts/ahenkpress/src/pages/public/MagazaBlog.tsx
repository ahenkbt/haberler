import { useEffect, useState } from "react";
import { SellzyLatestBlogs } from "@/themes/sellzy/SellzyHomeSections";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";
import type { SellzyBlogPost } from "@/themes/sellzy/types";

export default function MagazaBlog() {
  const [posts, setPosts] = useState<SellzyBlogPost[]>([]);

  useEffect(() => {
    fetch("/api/delivery/marketplace?lang=tr&limit=12")
      .then((r) => r.json())
      .then((d) => setPosts(d?.data?.blogPosts ?? []))
      .catch(() => setPosts([]));
  }, []);

  return (
    <main className={`w-full pb-10 md:pb-14 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
      <SellzyContainer>
        <h1 className="text-[32px] font-bold text-light-primary-text mb-8">Pazaryeri blogu</h1>
      </SellzyContainer>
      <SellzyLatestBlogs posts={posts} />
    </main>
  );
}
