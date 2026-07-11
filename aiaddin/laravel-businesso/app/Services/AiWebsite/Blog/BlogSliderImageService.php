<?php

namespace App\Services\AiWebsite\Blog;

use App\Models\User\Blog;
use App\Services\MasterAiGenerator;

class BlogSliderImageService
{
  protected $ai;
  protected $sliderImageStoragePath = 'assets/front/img/user/blogs/slider/';
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

      $blogsWithSlider = Blog::where('user_id', $userId)
        ->whereNotNull('slider_post_image')
        ->get();

      foreach ($blogsWithSlider as $blog) {
        if ($blog->slider_post_image && file_exists(public_path($this->sliderImageStoragePath . $blog->slider_post_image))) {
          @unlink(public_path($this->sliderImageStoragePath . $blog->slider_post_image)); 
        }
      }

      Blog::where('user_id', $userId)
        ->update([
          'is_slider'         => 0,
          'slider_post_image' => null,
        ]);
    }

    $blogs = Blog::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    foreach ($blogs as $blog) {

      $prompt = "Professional widescreen photograph for {$blog->title}, cinematic panoramic composition, natural dramatic lighting, high-end editorial magazine style, {$this->ai->getIndustry()} industry theme, vibrant rich colors, sharp focus, hero banner quality, no text overlays, no graphic elements, pure photography only";

      $sliderImage = $this->ai->generateImage(
        $prompt,
        1920,
        800,
        $this->sliderImageStoragePath
      );

      $blog->update([
        'is_slider'          => 1,
        'slider_post_image'  => $sliderImage,
      ]);
    }
  }
}
