<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\Jcategory;
use App\Services\MasterAiGenerator;

class JobCategoryService
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
    $categoryData = $this->getCategoryData();
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      Jcategory::where('user_id', $userId)->delete();
    }

    foreach ($categoryData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);

      Jcategory::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'name' => $this->extractCleanTitle($name),
        'status' => 1,
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
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a job category name for technical/development positions in {$industry}.
                Examples: Software Development, IT & Technology, Engineering, Technical Services
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a job category name for marketing positions in {$industry}.
                Examples: Marketing & Sales, Digital Marketing, Business Development
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a job category name for design/creative positions in {$industry}.
                Examples: Design & Creative, UI UX Design, Creative Services
                Output: Just the category name, nothing else.
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
