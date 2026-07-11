<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\FooterQuickLink;
use App\Services\MasterAiGenerator;

class FooterQuickLinkService
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
    // Delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      FooterQuickLink::where('user_id', $userId)->delete();
    }

    $quickLinkData = $this->getQuickLinkData();

    foreach ($quickLinkData as $index => $data) {
      $title = $this->ai->generateText($data['title_prompt']);

      FooterQuickLink::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'title' => $this->extractCleanTitle($title),
        'url' => $data['url'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getQuickLinkData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'title_prompt' => "You must return ONLY 1-2 words. No formatting, no explanation.
                Generate a quick link title for 'About' page.
                Examples: About Us, Our Story, Company Info, Who We Are
                Output: Just 1-2 words, nothing else.",
        'url' => '/about',
      ],
      [
        'title_prompt' => "You must return ONLY 1-2 words. No formatting, no explanation.
                Generate a quick link title for services page for {$industry} business.
                Examples: Our Services, Services, What We Do, Solutions
                Output: Just 1-2 words, nothing else.
                Context: {$baseContext}",
        'url' => '/services',
      ],
      [
        'title_prompt' => "You must return ONLY 1-2 words. No formatting, no explanation.
                Generate a quick link title for portfolio/projects page.
                Examples: Portfolio, Our Work, Projects, Case Studies
                Output: Just 1-2 words, nothing else.",
        'url' => '/portfolio',
      ],
      [
        'title_prompt' => "You must return ONLY 1-2 words. No formatting, no explanation.
                Generate a quick link title for contact page.
                Examples: Contact Us, Contact, Get in Touch, Reach Us
                Output: Just 1-2 words, nothing else.",
        'url' => '/contact',
      ],

      [
        'title_prompt' => "You must return ONLY 1-2 words. No formatting, no explanation.
                Generate a quick link title for careers/jobs page.
                Examples: Careers, Join Us, Jobs, Work With Us
                Output: Just 1-2 words, nothing else.",
        'url' => '/careers',
      ],
    ];
  }

  private function extractCleanTitle($text)
  {
    // Remove common AI response patterns
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);

    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
