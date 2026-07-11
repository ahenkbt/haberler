<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\FooterText;
use App\Services\MasterAiGenerator;

class FooterTextService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/footer/';
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

      $oldFooter = FooterText::where('user_id', $userId)
        ->where('language_id', $this->ai->getDefaultLanguageId())
        ->first();

      if ($oldFooter) {
        // Logo
        if ($oldFooter->logo && file_exists(public_path($this->imageStoragePath . $oldFooter->logo))) {
          @unlink(public_path($this->imageStoragePath . $oldFooter->logo));
        }

        // Background image
        if ($oldFooter->bg_image && file_exists(public_path($this->imageStoragePath . $oldFooter->bg_image))) {
          @unlink(public_path($this->imageStoragePath . $oldFooter->bg_image));
        }
      }

      FooterText::where('user_id', $userId)
        ->where('language_id', $this->ai->getDefaultLanguageId())
        ->delete();
    }

    $footerData = $this->getFooterData();

    $aboutCompany = $this->ai->generateText($footerData['about_company_prompt']);
    $copyrightText = $this->ai->generateText($footerData['copyright_prompt']);
    $newsletterText = $this->ai->generateText($footerData['newsletter_prompt']);

    // Generate footer logo
    $logo = $this->ai->generateImage(
      $footerData['logo_prompt'],
      146,
      40,
      $this->imageStoragePath
    );

    // Generate footer background image 
    $bgImage = $this->ai->generateImage(
      $footerData['bg_image_prompt'],
      1920,
      400,
      $this->imageStoragePath
    );

    FooterText::updateOrCreate(
      [
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
      ],
      [
        'about_company' => $this->extractCleanText($aboutCompany),
        'copyright_text' => $this->extractCleanText($copyrightText),
        'newsletter_text' => $this->extractCleanText($newsletterText),
        'logo' => $logo,
        'bg_image' => $bgImage,
        'footer_color' => '2C3E50', 
      ]
    );
  }

  private function getFooterData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();
    $currentYear = date('Y');

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      'about_company_prompt' => "You must return EXACTLY 12-15 words. No formatting, no explanation.
            Write a compelling 'About Company' footer text for {$businessName}.
            Describe: company mission, core values, and what makes the business unique in {$industry}.
            Use professional, concise language. Write in third person.
            Output: Plain text only, 12-15 words total.
            Context: {$baseContext}",

      'copyright_prompt' => "You must return ONLY ONE copyright line. No formatting, no explanation.
            Generate a professional copyright text for {$businessName}.
            Format: © {$currentYear} [Company Name]. All Rights Reserved.
            Keep it simple and professional.
            Output: Just the copyright line, nothing else.
            Example: © {$currentYear} {$businessName}. All Rights Reserved.",

      'newsletter_prompt' => "You must return EXACTLY 15-20 words. No formatting, no explanation.
            Write an engaging newsletter subscription text for {$businessName}.
            Encourage: email signup, staying updated, receiving exclusive content.
            Use inviting, action-oriented language.
            Output: Plain text only, 15-20 words.
            Good examples: Subscribe to our newsletter for latest updates and exclusive offers, Stay connected with our latest news and industry insights
            Context: {$baseContext}",

      'logo_prompt' => "Professional minimalist logo design for {$businessName} representing {$industry} business, STYLE: clean modern geometric symbol or abstract lettermark based on company initials, simple distinctive shape with bold lines, flat 2D vector design, contemporary corporate identity, COMPOSITION: either iconic symbol only OR company name text with integrated icon mark, single or dual color scheme, professional brand mark, CRITICAL REQUIREMENTS: minimal design, NO photorealistic images, NO complex illustrations, NO 3D effects, scalable logo suitable for 200x60 pixel display, works on both light and dark backgrounds, memorable and recognizable at small sizes, vector-style clean edges",

      'bg_image_prompt' => "Professional footer background pattern for {$industry} business website, subtle geometric design, dark elegant theme, modern corporate style, abstract professional texture, low opacity background suitable for text overlay",
    ];
  }

  private function extractCleanText($text)
  {
    // Remove common AI response patterns
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);

    return trim($text);
  }
}
