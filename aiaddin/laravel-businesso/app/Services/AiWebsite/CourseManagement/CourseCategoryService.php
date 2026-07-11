<?php

namespace App\Services\AiWebsite\CourseManagement;

use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\Language;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class CourseCategoryService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(int $count = 4) 
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      CourseCategory::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }
    $count = 4;

    $defs = $this->getCategoryDefinitions(); 

    for ($index = 0; $index < $count; $index++) {
      $def = $defs[$index];

      $rawName = $this->ai->generateText($def['name_prompt']);
      $name    = $this->extractName($rawName);

      if (!$name || strlen($name) < 3) {
        continue;
      }

      $exists = CourseCategory::where('user_id', $userId)
        ->where('language_id', $language->id)
        ->where('name', $name)
        ->exists();

      if ($exists) {
        continue;
      }

      $slug = slug_create($name);

      if (
        CourseCategory::where('user_id', $userId)
        ->where('language_id', $language->id)
        ->where('slug', $slug)
        ->exists()
      ) {
        $slug = $slug . '-' . time() . '-' . rand(10, 99);
      }

      CourseCategory::create([
        'language_id'   => $language->id,
        'user_id'       => $userId,
        'icon'          => $def['icon'],
        'color'         => $def['color'],
        'name'          => $name,
        'status'        => 1,
        'serial_number' => $index + 1,
        'is_featured'   => $def['is_featured'] ? 1 : 0,
        'slug'          => $slug,
      ]);
    }
  }

  private function getCategoryDefinitions(): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} runs {$industry}-related online courses and training. {$info}";

    return [
      [ 
        'icon'        => 'fas fa-code',
        'color'       => '2563eb',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a course category name for programming / development.
                Examples: Web Development, Programming & Coding, Software Development
                Output: Just the name, nothing else.
                Context: {$baseContext}",
      ],
      [ 
        'icon'        => 'fas fa-bullhorn',
        'color'       => 'ef4444',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a course category name for marketing and business.
                Examples: Digital Marketing, Business & Entrepreneurship, Sales & Branding
                Output: Just the name, nothing else.
                Context: {$baseContext}",
      ],
      [ 
        'icon'        => 'fas fa-chart-line',
        'color'       => '22c55e',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a course category name for data / analytics / AI.
                Examples: Data Science, Analytics & BI, AI & Machine Learning
                Output: Just the name, nothing else.
                Context: {$baseContext}",
      ],
      [ 
        'icon'        => 'fas fa-palette',
        'color'       => 'a855f7',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a course category name for design and creative skills.
                Examples: Graphic Design, UI UX Design, Creative Arts
                Output: Just the name, nothing else.
                Context: {$baseContext}",
      ],
    ];
  }

  private function extractName(string $text): string
  {
    $text = preg_replace('/^(Here are|Here is|Options:|Sure|Certainly)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > 60) {
      $text = substr($text, 0, 60);
    }

    return $text;
  }
}
