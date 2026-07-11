<?php

namespace App\Services\AiWebsite\GalleryManagement;

use App\Models\User\GalleryItem;
use App\Models\User\GalleryCategory;
use App\Services\MasterAiGenerator;

class GalleryItemService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/gallery/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    // Delete old records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldItems = GalleryItem::where('user_id', $userId)->get();

      foreach ($oldItems as $item) {
        if ($item->image && file_exists(public_path($this->imageStoragePath . $item->image))) {
          @unlink(public_path($this->imageStoragePath . $item->image));
        }
      }
      GalleryItem::where('user_id', $userId)->delete();
    }

    // Get gallery categories
    $categories = GalleryCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    if ($categories->isEmpty()) {
      $categoryService = new GalleryCategoryService($this->ai);
      $categoryService->generate();
      $categories = GalleryCategory::where('user_id', $this->ai->getUserId())->get();
    }

    // Generate 1 image per category
    $serialNumber = 1;

    foreach ($categories as $category) {
      $data = $this->getItemData($category);

      $title = $this->ai->generateText($data['title_prompt']);
      $cleanTitle = $this->extractCleanTitle($title);

      // Generate image
      $image = $this->ai->generateImage(
        $data['image_prompt'],
        1200,
        800,
        $this->imageStoragePath
      );

      GalleryItem::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'gallery_category_id' => $category->id,
        'title' => $cleanTitle,
        'item_type' => 'image',
        'image' => $image,
        'video_link' => null,
        'serial_number' => $serialNumber,
        'is_featured' => ($serialNumber <= 3) ? 1 : 0,
      ]);

      $serialNumber++;
    }
  }

  private function getItemData($category)
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $categoryName = $category->name;

    $baseContext = "{$businessName} operates in {$industry} industry. Gallery category: {$categoryName}";

    // Detect if category likely contains people/team photos
    $categoryLower = strtolower($categoryName);
    $hasPeople = (
      strpos($categoryLower, 'team') !== false ||
      strpos($categoryLower, 'people') !== false ||
      strpos($categoryLower, 'staff') !== false ||
      strpos($categoryLower, 'employee') !== false ||
      strpos($categoryLower, 'office') !== false ||
      strpos($categoryLower, 'workspace') !== false ||
      strpos($categoryLower, 'meeting') !== false 
    );

    // Quality enhancers
    $humanQualityEnhancer = ", professional corporate photography, shot with 85mm portrait lens f/2.8, natural realistic faces, diverse group of professional men and women clearly visible, proper human proportions, complete faces with all features intact, realistic skin tones and textures, natural expressions, individual distinct facial features for each person, both male and female professionals present, clear gender diversity, full head and shoulders visible, no cropped heads, studio quality lighting, sharp focus on faces";

    $humanNegativePrompt = ", CRITICAL AVOID: missing heads, cropped faces, headless people, blurry faces, identical faces, uniform gender, all male or all female only, plastic skin, doll-like appearance, distorted proportions, synthetic look, airbrushed faces, cloned people, unrealistic features";

    $productQualityEnhancer = ", professional product photography, studio lighting, sharp focus, high detail, clean composition, vibrant accurate colors, commercial quality";

    $productNegativePrompt = ", AVOID: blurry, low quality, distorted, poor lighting, cluttered background";

    return [
      'title_prompt' => "You must return ONLY 4-8 words. No formatting, no explanation.
        Generate a descriptive photo title for {$categoryName} gallery in {$industry} business.
        Make it specific and engaging.
        
        Examples for Office: Modern Open Space Work Environment, Creative Team Collaboration Area
        Examples for Team: Diverse Professional Team Meeting, Annual Company Celebration Event
        Examples for Products: Premium Product Display Showcase, Latest Collection Launch Event
        
        Output: Just the title, nothing else.
        Context: {$baseContext}",

      'image_prompt' => $hasPeople
        ? "Professional corporate photography of {$categoryName} in {$industry} business context, diverse group showing both male and female professionals working together in modern office environment, realistic people with complete faces and heads fully visible, natural business setting, professional attire, contemporary workplace, multiple people of different genders clearly distinguishable, natural poses and interactions" . $humanQualityEnhancer . $humanNegativePrompt
        : "Create premium gallery image for '{$categoryName}' of {$baseContext}. " .
        "High-quality professional aesthetic, clean modern design, " .
        "industry-appropriate visuals, realistic setting. " .
        $productQualityEnhancer . $productNegativePrompt
    ];
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Options:|Choose from:)[:\s]*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•\d\.]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    return trim($text);
  }
}
