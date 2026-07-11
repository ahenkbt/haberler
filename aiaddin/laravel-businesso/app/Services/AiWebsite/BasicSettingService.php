<?php

namespace App\Services\AiWebsite;

use App\Models\User\BasicSetting;
use App\Services\MasterAiGenerator;

class BasicSettingService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/';
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

      $oldSetting = BasicSetting::where('user_id', $userId)->first();

      if ($oldSetting) {
        // Favicon
        if ($oldSetting->favicon && file_exists(public_path($this->imageStoragePath . $oldSetting->favicon))) {
          @unlink(public_path($this->imageStoragePath . $oldSetting->favicon));
        }

        // Logo
        if ($oldSetting->logo && file_exists(public_path($this->imageStoragePath . $oldSetting->logo))) {
          @unlink(public_path($this->imageStoragePath . $oldSetting->logo));
        }

        // Breadcrumb
        if ($oldSetting->breadcrumb && file_exists(public_path($this->imageStoragePath . $oldSetting->breadcrumb))) {
          @unlink(public_path($this->imageStoragePath . $oldSetting->breadcrumb));
        }
      }

      // BasicSetting::where('user_id', $userId)->delete();
    }

    $settingData = $this->getSettingData();

    // Generate website title
    $websiteTitle = $this->ai->generateText($settingData['website_title_prompt']);
    $cleanWebsiteTitle = $this->extractCleanTitle($websiteTitle);

    // Generate favicon
    $favicon = $this->ai->generateImage(
      $settingData['favicon_prompt'],
      64,
      64,
      $this->imageStoragePath
    );

    // Generate logo
    $logo = $this->ai->generateImage(
      $settingData['logo_prompt'],
      200,
      60,
      $this->imageStoragePath
    );

    // Generate breadcrumb
    $breadcrumb = $this->ai->generateImage(
      $settingData['breadcrumb_prompt'],
      1920,
      400,
      $this->imageStoragePath
    );

    // Generate cookie alert text
    $cookieAlertText = $this->ai->generateText($settingData['cookie_alert_text_prompt']);
    $cookieButtonText = $this->ai->generateText($settingData['cookie_button_text_prompt']);

    BasicSetting::updateOrCreate(
      [
        'user_id' => $this->ai->getUserId(),
      ],
      [
        'website_title' => $cleanWebsiteTitle,
        'favicon' => $favicon,
        'logo' => $logo,
        'breadcrumb' => $breadcrumb,
        'cookie_alert_status' => 1,
        'cookie_alert_text' => $this->extractCleanText($cookieAlertText),
        'cookie_alert_button_text' => $this->extractCleanTitle($cookieButtonText),
      ]
    );
  }

  private function getSettingData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      'website_title_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a professional website title for {$businessName}.
            Format options:
            - [Business Name] | [Tagline]
            - [Business Name] - [Industry] [Service Type]
            - [Business Name] | [Key Value Proposition]
            
            Examples:
            - TechFlow Solutions | Digital Innovation
            - Creative Agency - Marketing & Design
            - ProBuild Construction | Quality You Trust
            - DataCore Analytics - Business Intelligence
            
            Make it SEO-friendly, memorable, and professional.
            Output: Just the website title, nothing else.
            Context: {$baseContext}",
      'favicon_prompt' => "Professional favicon icon for {$businessName} in {$industry} industry, simple minimalist logo design, 64x64 pixel format, recognizable brand symbol, clean icon suitable for browser tab",

      'logo_prompt' => "Professional company logo for {$businessName}, modern {$industry} business branding, clean and memorable design, horizontal layout suitable for website header, high-quality corporate logo, 200x60 pixel format",

      'breadcrumb_prompt' => "Professional website breadcrumb background banner for {$industry} business, modern elegant design, subtle pattern or gradient, professional corporate style, suitable for page headers, 1920x400 pixel format",

      'cookie_alert_text_prompt' => "You must return EXACTLY 25-35 words. No formatting, no explanation.
            Write a clear, friendly cookie consent message for website visitors.
            Explain: cookies improve experience, user agreement, privacy respect.
            Use simple, transparent language.
            Examples: We use cookies to enhance your browsing experience and analyze site traffic. By continuing to use our website, you agree to our use of cookies.
            Output: Plain text only, 25-35 words.
            Context: {$baseContext}",

      'cookie_button_text_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a cookie consent button text.
            Examples: Accept Cookies, I Agree, Got It, Accept All
            Output: Just the button text, nothing else.",
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

  private function extractCleanText($text)
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/m', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
