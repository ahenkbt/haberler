<?php

namespace App\Services\AiWebsite\ShopManagement;

use App\Models\User\UserItemCategory;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class ItemCategoryService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/items/categories/';
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

      $oldCategories = UserItemCategory::where('user_id', $userId)->get();

      foreach ($oldCategories as $category) {
        if ($category->image && file_exists(public_path($this->imageStoragePath . $category->image))) {
          @unlink(public_path($this->imageStoragePath . $category->image)); 
        }
      }
      UserItemCategory::where('user_id', $userId)->delete();
    } 

    $categoryData = $this->getCategoryData();

    foreach ($categoryData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);
      $cleanName = $this->extractCleanTitle($name);
      $slug = rawurlencode(Str::slug($cleanName));

      // Check if slug already exists
      $exists = UserItemCategory::where('user_id', $this->ai->getUserId())
        ->where('slug', $slug)
        ->where('language_id', $this->ai->getDefaultLanguageId())
        ->exists();

      if ($exists) {
        $slug = $slug . '-' . time() . '-' . rand(100, 999);
      }

      // Generate category image
      $image = $this->ai->generateImage(
        $data['image_prompt'],
        400,
        400,
        $this->imageStoragePath
      );

      UserItemCategory::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'name' => $cleanName,
        'slug' => $slug,
        'image' => $image,
        'status' => 1,
        'is_feature' => $data['is_feature'],
      ]);
    }
  }


  private function getCategoryData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    // Detect if industry is digital/service-based
    $digitalKeywords = ['software', 'digital', 'technology', 'consulting', 'marketing', 'agency', 'saas', 'web', 'app'];
    $isDigital = false;

    foreach ($digitalKeywords as $keyword) {
      if (stripos($industry, $keyword) !== false) {
        $isDigital = true;
        break;
      }
    }

    return [
      [
        'name_prompt' => "Return ONLY 2-3 words. No formatting.
                Generate a product category name for {$industry}.
                Examples for physical: Electronics, Fashion, Home Goods
                Examples for digital: Digital Products, Software Tools, Online Services
                Output: Category name only.
                Context: {$baseContext}",

        'image_prompt' => $this->getImagePrompt($industry, $isDigital, 'primary'),
        'is_feature' => 1,
      ],
      [
        'name_prompt' => "Return ONLY 2-3 words. No formatting.
                Generate a different product category for {$industry}.
                Examples: Premium Services, Best Sellers, New Arrivals
                Output: Category name only.
                Context: {$baseContext}",

        'image_prompt' => $this->getImagePrompt($industry, $isDigital, 'secondary'),
        'is_feature' => 1,
      ],
    ];
  }

  private function getImagePrompt($industry, $isDigital, $type)
  {
    if ($isDigital) {
      return "Digital product icon for {$industry}, flat vector illustration, NO HUMANS, NO FACES, abstract geometric shapes, modern tech style, clean gradient background, minimalist digital asset icon, professional UI design, screen/interface elements";
    } else {
      return "Physical product icon for {$industry}, isometric 3D object, NO PEOPLE, NO FACES, realistic product illustration, clean white background, professional e-commerce photography style, single object focus, commercial catalog image";
    }
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
