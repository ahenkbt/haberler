<?php

namespace App\Services\AiWebsite\Blog;

use App\Models\User\Blog;
use App\Models\User\BlogCategory;
use App\Services\AiWebsite\Blog\BlogCategoryService;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class BlogService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/blogs/';
  protected $sliderImageStoragePath = 'assets/front/img/user/blogs/slider/';
  protected $featuredImageStoragePath = 'assets/front/img/user/blogs/featured/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldBlogs = Blog::where('user_id', $userId)->get();

      foreach ($oldBlogs as $blog) {

        if ($blog->image && file_exists(public_path($this->imageStoragePath . $blog->image))) {
          @unlink(public_path($this->imageStoragePath . $blog->image));
        }

        if ($blog->image2 && file_exists(public_path($this->imageStoragePath . $blog->image2))) {
          @unlink(public_path($this->imageStoragePath . $blog->image2));
        }

        if ($blog->slider_post_image && file_exists(public_path($this->sliderImageStoragePath . $blog->slider_post_image))) {
          @unlink(public_path($this->sliderImageStoragePath . $blog->slider_post_image));
        }

        if ($blog->featured_post_image && file_exists(public_path($this->featuredImageStoragePath . $blog->featured_post_image))) {
          @unlink(public_path($this->featuredImageStoragePath . $blog->featured_post_image));
        }
      }

      Blog::where('user_id', $userId)->delete();
    }

    // Get blog categories
    $categories = BlogCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    if ($categories->isEmpty()) {
      $categoryService = new BlogCategoryService($this->ai);
      $categoryService->generate();
      $categories = BlogCategory::where('user_id', $this->ai->getUserId())->get();
    }

    // Generate 2 blogs per category 
    $blogData = $this->getBlogData($categories);

    foreach ($blogData as $index => $data) {
      $title = $this->ai->generateText($data['title_prompt']);
      $cleanTitle = $this->extractCleanTitle($title);
      $slug = Str::slug($cleanTitle);

      // Check if slug already exists
      $exists = Blog::where('user_id', $this->ai->getUserId())
        ->where('slug', $slug)
        ->exists();

      if ($exists) {
        $slug = $slug . '-' . time() . '-' . rand(100, 999);
      }

      // Generate blog content
      $content = $this->ai->generateText($data['content_prompt']);
      $metaKeywords = $this->ai->generateText($data['meta_keywords_prompt']);
      $metaDescription = $this->ai->generateText($data['meta_description_prompt']);

      // Generate main blog image
      $image = $this->ai->generateImage(
        $data['image_prompt'],
        1200,
        800,
        $this->imageStoragePath
      );

      // Generate second image 
      $image2 = $this->ai->generateImage(
        $data['image2_prompt'],
        800,
        600,
        $this->imageStoragePath
      );

      Blog::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'category_id' => $data['category_id'],
        'title' => $cleanTitle,
        'slug' => $slug,
        'content' => $this->extractCleanText($content),
        'image' => $image,
        'image2' => $image2,
        'serial_number' => $index + 1,
        'meta_keywords' => $this->extractCleanText($metaKeywords),
        'meta_description' => $this->extractCleanText($metaDescription),
        'is_slider' => 0,
        'slider_post_image' => null,
        'is_featured' => 0,
        'featured_post_image' => null,
        'views' => rand(50, 500),
      ]);
    }
  }

  private function getBlogData($categories)
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $blogs = [];

    // Generate 1 blog per category 
    foreach ($categories as $categoryIndex => $category) {
      $blogNumber = $categoryIndex + 1;
      $isSlider = ($blogNumber <= 3);
      $isFeatured = ($blogNumber <= 4);

      $blogs[] = [
        'category_id' => $category->id,

        'title_prompt' => "You must return ONLY 8-12 words. No formatting, no explanation.
                Generate an engaging, click-worthy blog post title for {$category->name} category in {$industry} industry.
                Make it informative, interesting, and SEO-friendly.
                Examples: 10 Essential Tips for Digital Marketing Success in 2025, How AI is Transforming the Future of Business, Complete Guide to Building Your First Mobile App
                Output: Just the blog title, nothing else.
                Context: {$baseContext}",

        'content_prompt' => "You must return EXACTLY 400-500 words. No formatting, no explanation.
                Write a comprehensive, informative blog post about the title topic for {$category->name} category.
                Structure: Introduction (50 words), Main content with 3-4 key points (300 words), Conclusion with call-to-action (50 words).
                Include: actionable insights, industry expertise, practical examples, current trends, expert perspective.
                Use professional, engaging, educational tone. Write in paragraphs.
                Output: Plain text only, 400-500 words total.
                Context: {$baseContext}",

        'meta_keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate relevant SEO keywords for this {$category->name} blog post.
                Focus on: main topic keywords, industry terms, trending phrases, long-tail keywords.
                Output: Comma-separated keywords only.",

        'meta_description_prompt' => "You must return EXACTLY 140-155 characters. No formatting.
                Write an SEO meta description for this blog post.
                Include: main benefit, topic summary, call to read.
                Output: Plain text only, 140-155 characters.",

        'image_prompt' => "Professional blog featured image for {$category->name} article, modern editorial design, relevant to {$industry} topic, high-quality blog header image, engaging visual content, professional photography or illustration, 1200x800 aspect ratio",

        'image2_prompt' => "Supporting blog content image for {$category->name} post, infographic style or conceptual illustration, {$industry} context, professional quality, informative visual design, complementary to main image",

        'slider_image_prompt' => "Eye-catching blog slider banner for {$category->name} featured article, wide panoramic format hero image, {$industry} theme, professional editorial design, engaging and clickable visual, 1920x800 landscape",

        'featured_image_prompt' => "Prominent featured blog post thumbnail for {$category->name}, attention-grabbing design, {$industry} related visual, high-quality square or landscape format, professional blog card image",

        'is_slider' => $isSlider ? 1 : 0,
        'is_featured' => $isFeatured ? 1 : 0,
      ];
    }

    return $blogs;
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    return trim($text);
  }

  private function extractCleanText($text)
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/m', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
