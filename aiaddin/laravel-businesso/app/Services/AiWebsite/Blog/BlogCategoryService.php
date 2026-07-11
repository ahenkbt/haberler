<?php

namespace App\Services\AiWebsite\Blog;

use App\Models\User\BlogCategory;
use App\Services\MasterAiGenerator;

class BlogCategoryService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/blogs/categories/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    //delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldCategories = BlogCategory::where('user_id', $userId)->get();

      foreach ($oldCategories as $category) {
        if ($category->image && file_exists(public_path($this->imageStoragePath . $category->image))) {
          @unlink(public_path($this->imageStoragePath . $category->image)); 
        }
      }

      BlogCategory::where('user_id', $userId)->delete();
    }

    $theme = $this->ai->getTheme();
    $categoryData = $this->getCategoryData();

    foreach ($categoryData as $index => $data) {
      //  Generate category name
      $name = $this->ai->generateText($data['name_prompt']);
      $cleanName = $this->extractCleanTitle($name);

      $categoryInput = [
        'user_id'        => $this->ai->getUserId(),
        'language_id'    => $this->ai->getDefaultLanguageId(),
        'name'           => $cleanName,
        'status'         => 1,
        'is_featured'    => $data['is_featured'],
        'serial_number'  => $index + 1,
      ];

      // Generate image only for theme thirteen
      if ($theme == 'home_thirteen') {

        $imagePrompt = str_replace(
          ['{category_name}', '{industry}'],
          [$cleanName, $this->ai->getIndustry()],
          $data['image_prompt']
        );

        $image = $this->ai->generateImage(
          $imagePrompt,
          202,
          120,
          $this->imageStoragePath
        );

        $categoryInput['image'] = $image;
      } else {
        $categoryInput['image'] = null;
      }

      BlogCategory::create($categoryInput);
    }
  }

  private function getCategoryData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                        Generate a blog category name related to industry news and updates for {$industry}.
                        Examples: Industry News, Latest Updates, Business Insights, Market Trends
                        Output: Just the category name, nothing else.
                        Context: {$baseContext}",

        // Natural photographic style for industry news
        'image_prompt' => "Professional high-quality photograph representing \"{category_name}\" in {industry} industry, natural lighting, modern business setting, realistic photo, professional photography, clean composition, editorial style",

        'is_featured' => 1,
      ],
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                        Generate a blog category name for tips and guides in {$industry}.
                        Examples: Tips Guides, How To, Expert Advice, Best Practices
                        Output: Just the category name, nothing else.
                        Context: {$baseContext}",

        // Natural photographic style for tips/guides
        'image_prompt' => "Natural photograph showing \"{category_name}\" concept in {industry} context, realistic scene, professional quality image, good lighting, authentic moment, editorial photography style",

        'is_featured' => 1,
      ],
    ];
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);

    $text = preg_replace('/[*_#`~\[\]]/', '', $text);

    $text = preg_replace('/^[\s\-•]+/', '', $text);

    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
