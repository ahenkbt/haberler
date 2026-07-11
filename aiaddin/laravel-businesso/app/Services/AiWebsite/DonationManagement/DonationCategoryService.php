<?php

namespace App\Services\AiWebsite\DonationManagement;

use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\Language;
use App\Models\User\BasicSetting;
use App\Services\MasterAiGenerator;
use App\Constants\Constant;

class DonationCategoryService
{
  protected $ai;
  protected $imagePath = 'assets/tenant/image/cause/category/';
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

      $oldCategories = DonationCategories::where('user_id', $userId)->get();

      foreach ($oldCategories as $category) {
        if ($category->image && file_exists(public_path($this->imagePath . $category->image))) {
          @unlink(public_path($this->imagePath . $category->image)); 
        }
      }

      DonationCategories::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $userBs = BasicSetting::query()
      ->select('theme')
      ->where('user_id', $userId)
      ->first();

    $theme        = $userBs->theme ?? null;
    $definitions  = $this->getCategoryDefinitions($count);
    $serial       = 1;

    foreach ($definitions as $def) {

      $imageName = $this->ai->generateImage(
        $def['image_prompt'],
        600,
        400,
        $this->imagePath,
      );

      $rawName  = $this->ai->generateText($def['name_prompt']);
      $rawShort = $this->ai->generateText($def['short_prompt']);

      $name           = $this->cleanLine($rawName, 80);
      $shortDesc      = $this->cleanText($rawShort, 200);
      $slug           = make_slug($name);
      $isFeaturedFlag = $def['is_featured'] && $theme === 'home_eleven' ? 1 : 0;

      DonationCategories::create([
        'language_id'      => $language->id,
        'user_id'          => $userId,
        'name'             => $name,
        'short_description' => $shortDesc,
        'icon'             => $def['icon'],
        'status'           => 1,
        'is_featured'      => $isFeaturedFlag,
        'serial_number'    => $serial++,
        'image'            => $imageName,
        'slug'             => $slug,
      ]);
    }
  }

  private function getCategoryDefinitions(int $count): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} runs donation campaigns for social impact. Generate clear, donor‑friendly cause categories.";

    $base = [
      [
        'icon'        => 'fas fa-graduation-cap',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a donation category name for education support.
                Examples: Education For All, Children’s Education, School Support
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'short_prompt' => "You must return 8-10 words. No formatting, no explanation.
                Write a short description for an education-related donation category.
                Focus on: helping children study, access to schools, learning materials.
                Output: Plain text only, 8-10 words.
                Context: {$baseContext}",

        'image_prompt' => "Donation campaign banner for education, children learning in classroom, hopeful atmosphere, charity illustration or photo, warm colors",
      ],
      [
        'icon'        => 'fas fa-heartbeat',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a donation category name for healthcare and medical aid.
                Examples: Health & Medical Aid, Emergency Medical Help, Save Lives Fund
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'short_prompt' => "You must return 8-10 words. No formatting, no explanation.
                Write a short description for a health and medical support donation category.
                Focus on: treatments, medicines, emergency care.
                Output: Plain text only, 8-10 words.
                Context: {$baseContext}",

        'image_prompt' => "Charity campaign image for medical aid, doctors helping patients, hospital or clinic context, caring and compassionate tone",
      ],
      [
        'icon'        => 'fas fa-utensils',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a donation category name for food & hunger relief.
                Examples: Hunger Relief, Feed The Hungry, Food Support
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'short_prompt' => "You must return 8-10 words. No formatting, no explanation.
                Write a short description for a food and hunger relief donation category.
                Focus on: meals, vulnerable families, regular food support.
                Output: Plain text only, 8-10 words.
                Context: {$baseContext}",

        'image_prompt' => "Donation banner showing food distribution, volunteers serving meals, humanitarian aid scene, hopeful tone",
      ],
      [
        'icon'        => 'fas fa-globe',
        'is_featured' => true,
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a donation category name for environment and clean water.
                Examples: Clean Water Project, Environment & Climate, Safe Drinking Water
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'short_prompt' => "You must return 8-10 words. No formatting, no explanation.
                Write a short description for an environment or clean water donation category.
                Focus on: safe water, community projects, nature protection.
                Output: Plain text only, 8-10 words.
                Context: {$baseContext}",

        'image_prompt' => "Charity campaign illustration for clean water and environment, children with water pumps, nature elements, positive impact visual",
      ],
    ];

    $result = [];
    for ($i = 0; $i < min($count, count($base)); $i++) {
      $result[] = $base[$i];
    }

    return $result;
  }

  private function cleanLine(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }

  private function cleanText(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }
}
