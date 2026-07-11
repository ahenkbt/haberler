<?php

namespace App\Services\AiWebsite\ShopManagement;

use App\Models\User\UserItemSubCategory;
use App\Models\User\UserItemCategory;
use App\Services\AiWebsite\ShopManagement\ItemCategoryService;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class ItemSubCategoryService
{
  protected $ai;
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

      UserItemSubCategory::where('user_id', $userId)->delete();
    }

    // Get all item categories
    $categories = UserItemCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    if ($categories->isEmpty()) {
      // Generate categories first if none exist
      $categoryService = new ItemCategoryService($this->ai);
      $categoryService->generate();
      $categories = UserItemCategory::where('user_id', $this->ai->getUserId())->get();
    }

    // Generate subcategories for each category

    foreach ($categories as $category) {

        $subCategoryData = $this->getSubCategoryData($category);

      $createdForThisCategory = 0;

      foreach ($subCategoryData as $data) {
        if ($createdForThisCategory >= 2) break;
        $name = $this->ai->generateText($data['name_prompt']);
        $cleanName = $this->extractCleanTitle($name);
        $slug = rawurlencode(Str::slug($cleanName));

        // Check if slug already exists
        $exists = UserItemSubCategory::where('user_id', $this->ai->getUserId())
          ->where('slug', $slug)
          ->where('language_id', $this->ai->getDefaultLanguageId())
          ->exists();

        if ($exists) {
          $slug = $slug . '-' . time() . '-' . rand(100, 999);
        }

        UserItemSubCategory::create([
          'user_id' => $this->ai->getUserId(),
          'language_id' => $this->ai->getDefaultLanguageId(),
          'category_id' => $category->id,
          'name' => $cleanName,
          'slug' => $slug,
          'status' => 1,
        ]);

        $createdForThisCategory++;
      }
    }
  }

  private function getSubCategoryData($category)
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $categoryName = $category->name;

    $baseContext = "{$businessName} operates in {$industry} industry. Parent category: {$categoryName}";

    return [
      [
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a subcategory name under '{$categoryName}' category for {$industry} e-commerce.
                Think of specific product types within this category.
                Examples for Electronics: Smartphones, Laptops, Cameras
                Examples for Fashion: Men Clothing, Women Shoes, Accessories
                Examples for Home Decor: Living Room, Bedroom, Kitchen
                Output: Just the subcategory name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate another different subcategory name under '{$categoryName}' category.
                Make it different from the first subcategory. Focus on variety.
                Output: Just the subcategory name, nothing else.
                Context: {$baseContext}",
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
