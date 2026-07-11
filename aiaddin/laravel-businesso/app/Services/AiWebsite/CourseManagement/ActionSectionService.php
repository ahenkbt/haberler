<?php

namespace App\Services\AiWebsite\CourseManagement;

use App\Models\User\ActionSection;
use App\Models\User\Language;
use App\Models\User\BasicSetting;
use App\Services\MasterAiGenerator;
use App\Constants\Constant;

class ActionSectionService
{
  protected $ai;
  protected $bgPath = 'assets/tenant/image/action-section/';
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

      $oldSections = ActionSection::where('user_id', $userId)->get();

      foreach ($oldSections as $section) {
        if ($section->background_image && file_exists(public_path($this->bgPath . $section->background_image))) {
          @unlink(public_path($this->bgPath . $section->background_image));
        }
      }

      ActionSection::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $existing = ActionSection::where('user_id', $userId)
      ->where('language_id', $language->id)
      ->first();

    $data = $this->getContentDefinition();

    // generate background image
    $backgroundImage = $this->ai->generateImage(
      $data['background_prompt'],
      1920,
      540,
      $this->bgPath
    );

    // texts
    $firstTitleRaw  = $this->ai->generateText($data['first_title_prompt']);
    $secondTitleRaw = $this->ai->generateText($data['second_title_prompt']);
    $firstBtnRaw    = $this->ai->generateText($data['first_button_prompt']);
    $secondBtnRaw   = $this->ai->generateText($data['second_button_prompt']);

    $firstTitle  = $this->extractCleanLine($firstTitleRaw, 80);
    $secondTitle = $this->extractCleanLine($secondTitleRaw, 140);
    $firstButton = $this->extractCleanLine($firstBtnRaw, 25);
    $secondButton = $this->extractCleanLine($secondBtnRaw, 25);

    $payload = [
      'language_id'      => $language->id,
      'user_id'          => $userId,
      'background_image' => $backgroundImage,
      'first_title'      => $firstTitle,
      'second_title'     => $secondTitle,
      'first_button'     => $firstButton,
      'first_button_url' => $data['first_button_url'],
      'second_button'    => $secondButton,
      'second_button_url' => $data['second_button_url'],
      'image'            => null, 
    ];

    if ($existing) {
      // update
      $existing->update($payload);
    } else {
      // create
      ActionSection::create($payload);
    }
  }

  private function getContentDefinition(): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} is a {$industry} business. {$info}";

    return [
      'background_prompt' => "minimal website call-to-action background for online course platform, soft solid pastel color with very subtle texture, on the right side a simple flat illustration of one student using a laptop inside a circular or rounded shape, NO buttons, NO text, NO logos, NO UI elements, left side completely empty clean space for overlay headline and buttons, flat 2D vector style, high resolution, not blurry, not noisy, AVOID: detailed UI, small icons, real screenshots, hard-to-read text",

      'first_title_prompt' => "You must return ONLY 5-6 words. No formatting, no explanation.
            Generate a strong headline for an online course call-to-action section.
            Focus on enrolling more students and highlighting transformation.
            Examples: Start Learning In-Demand Skills Today, Launch Your Career With Expert-Led Courses, Master New Skills With Flexible Online Classes
            Output: Just the headline text, nothing else.
            Context: {$baseContext}",

      'second_title_prompt' => "You must return EXACTLY 6-10 words. No formatting, no explanation.
            Write a short supporting line under the CTA headline.
            Explain main benefit, reduce hesitation, encourage action.
            Output: Plain text only, 6-10 words.
            Context: {$baseContext}",

      'first_button_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a primary CTA button text.
            Examples: Get Started, Book Now, Contact Us, Learn More
            Output: Just the button text, nothing else.
            Context: {$baseContext}",

      'second_button_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a secondary CTA button text.
            Examples: View Pricing, See Plans, Watch Demo, Explore More
            Output: Just the button text, nothing else.
            Context: {$baseContext}",

      'first_button_url'  => '/contact',
      'second_button_url' => '/services',
    ];
  }

  private function extractCleanLine(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)/i', '', $text);
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
