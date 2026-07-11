<?php

namespace App\Services\AiWebsite;

use App\Models\User\PortfolioCategory;
use App\Services\MasterAiGenerator;

class PortfolioCategoryService
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
      PortfolioCategory::where('user_id', $userId)->delete();
    }

    $categoryData = $this->getCategoryData();

    foreach ($categoryData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);

      PortfolioCategory::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'name' => $this->extractCleanTitle($name),
        'status' => 1,
        'is_featured' => $data['is_featured'],
        'serial_number' => $index + 1,
      ]);
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

        'name_prompt' => "Return ONLY 2-3 words. Output must be a primary service category for {$industry}. Avoid generic terms like 'All' or 'Projects'. Context: {$baseContext}",
        'is_featured' => 1,
      ],
      [

        'name_prompt' => "Return ONLY 2-3 words. Output must be a specialized niche or unique service in {$industry}. IMPORTANT: Do not repeat or use synonyms of the main service.          Context: {$baseContext}",
        'is_featured' => 1,
      ],
      [

        'name_prompt' => "Return ONLY 2-3 words. Output must be a creative, modern, or 'Expertise' oriented category name for {$industry}. Ensure this is distinct and does not overlap with previous service names.Context: {$baseContext}",
        'is_featured' => 0,
      ],
      [

        'name_prompt' => "Return ONLY 2-3 words. Output must be a category name focusing on 'Custom Solutions' or 'Signature Works' for {$industry}. It must be completely unique from the other categories.Context: {$baseContext}",
        'is_featured' => 0,
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
