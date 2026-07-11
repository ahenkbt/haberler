<?php

namespace App\Services\AiWebsite\Blog;

use App\Models\User\Blog;
use App\Services\MasterAiGenerator;

class BlogFeaturedImageService
{
  protected $ai;
  protected $featuredImageStoragePath = 'assets/front/img/user/blogs/featured/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }


  public function generate(): void
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $blogsWithFeatured = Blog::where('user_id', $userId)
        ->whereNotNull('featured_post_image')
        ->get();

      foreach ($blogsWithFeatured as $blog) {
        if ($blog->featured_post_image && file_exists(public_path($this->featuredImageStoragePath . $blog->featured_post_image))) {
          @unlink(public_path($this->featuredImageStoragePath . $blog->featured_post_image)); 
        }
      }

      Blog::where('user_id', $userId)
        ->update([
          'is_featured'        => 0,
          'featured_post_image' => null,
        ]);
    }

    $blogs = Blog::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    foreach ($blogs as $blog) {
      $prompt = "Professional high-quality photograph for {$blog->title}, clean overhead flat lay composition, natural lighting, vibrant colors, sharp focus, {$this->ai->getIndustry()} theme, editorial magazine style, minimalist aesthetic, no text overlays, no graphic elements, pure photography";

      $featuredImage = $this->ai->generateImage(
        $prompt,
        800,
        600,
        $this->featuredImageStoragePath
      );

      $blog->update([
        'is_featured'          => 1,
        'featured_post_image'  => $featuredImage,
      ]);
    }
  }
}
