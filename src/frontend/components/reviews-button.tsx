"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

interface ReviewsButtonProps {
  postId: number;
}

export default function ReviewsButton({ postId }: ReviewsButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/posts/${postId}/reviews`);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Reviews
    </Button>
  );
}
