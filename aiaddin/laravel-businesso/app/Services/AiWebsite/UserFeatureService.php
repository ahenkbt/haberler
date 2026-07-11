<?php

namespace App\Services\AiWebsite;

use App\Models\User\UserFeature;
use App\Models\User\Language;
use App\Services\MasterAiGenerator;

class UserFeatureService
{
  protected $ai;
  protected $iconPath = 'assets/front/img/user/feature/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(int $count = 3)
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldFeatures = UserFeature::where('user_id', $userId)->get();

      foreach ($oldFeatures as $feature) {
        if ($feature->icon && file_exists(public_path($this->iconPath . $feature->icon))) {
          @unlink(public_path($this->iconPath . $feature->icon)); 
        }
      }

      UserFeature::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();
    $theme = $this->ai->getThemeName();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $themeName  = $theme->theme ?? null;
    $definitions = $this->getFeatureDefinitions($count);

    $serial = 1;

    foreach ($definitions as $def) {

      $rawTitle = $this->ai->generateText($def['title_prompt']);
      $rawText  = $this->ai->generateText($def['text_prompt']);

      $title = $this->cleanLine($rawTitle, 50);
      $text  = $this->cleanLine($rawText, 255);

      $iconFilename = null;
      if ($themeName != 'home_ten') {
        $iconPrompt = $this->getIconImagePrompt($title);
        $iconFilename = $this->ai->generateImage(
          $iconPrompt,
          64,
          64,
          $this->iconPath
        );
      }

      UserFeature::create([
        'user_id'       => $userId,
        'language_id'   => $language->id,
        'color'         => $def['color'],
        'icon'          => $iconFilename,   
        'title'         => $title,
        'text'          => $text,
        'serial_number' => $serial++,
      ]);
    }
  }

  private function getFeatureDefinitions(int $count): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} is a {$industry} business. Highlight core benefits / features for the website feature section.";

    $base = [
      [
        'color'     => '2563eb',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
          Generate a short feature title about speed or efficiency.
          Examples: Fast Project Delivery, Lightning-Quick Support, Optimized Performance
          Output: Just the title text, nothing else.
          Context: {$baseContext}",
          'text_prompt' => "You must return 18-25 words. No formatting, no explanation.
          Describe how {$businessName} helps clients move faster or work more efficiently.
          Focus on: time savings, streamlined process, quick results.
          Output: Plain text only, 18-25 words.
          Context: {$baseContext}",
      ],
      [
        'color'     => '16a34a',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
          Generate a feature title about reliability or security.
          Examples: Reliable Trusted Service, Enterprise-Grade Security, Always-On Reliability
          Output: Just the title text, nothing else.
          Context: {$baseContext}",
          'text_prompt' => "You must return 18-25 words. No formatting, no explanation.
          Describe how {$businessName} ensures safety, stability or trust for customers.
          Focus on: reliability, data/security, long-term partnership.
          Output: Plain text only, 18-25 words.
          Context: {$baseContext}",
      ],
      [
        'color'     => 'f97316',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
        Generate a feature title about support or team.
        Examples: Dedicated Expert Team, Personal Customer Support, Human-Centered Service
        Output: Just the title text, nothing else.
        Context: {$baseContext}",
        'text_prompt' => "You must return 18-25 words. No formatting, no explanation.
        Describe how {$businessName}'s team supports clients.
        Focus on: expert guidance, responsive help, long-term support.
        Output: Plain text only, 18-25 words.
        Context: {$baseContext}",
      ],

    ];

    $result = [];
    for ($i = 0; $i < min($count, count($base)); $i++) {
      $result[] = $base[$i];
    }

    return $result;
  }


  private function getIconImagePrompt(string $title): string
  {
    return "Create a simple flat icon illustration for a website feature section.
    The icon must visually represent this feature title: \"{$title}\".  
    Style: minimal, solid shapes, no text, transparent or white background, works at 64x64 pixels.";
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
}
