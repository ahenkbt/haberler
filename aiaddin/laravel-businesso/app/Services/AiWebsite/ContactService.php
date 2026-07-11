<?php

namespace App\Services\AiWebsite;

use App\Models\User\UserContact;
use App\Services\MasterAiGenerator;

class ContactService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/';

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
  }

  public function generate()
  {
    $contactData = $this->getContactData();

    $title = $this->ai->generateText($contactData['title_prompt']);
    $subtitle = $this->ai->generateText($contactData['subtitle_prompt']);
    $addresses = $this->ai->generateText($contactData['addresses_prompt']);
    $numbers = $this->ai->generateText($contactData['numbers_prompt']);
    $mails = $this->ai->generateText($contactData['mails_prompt']);

    // Generate contact form image
    $image = $this->ai->generateImage(
      $contactData['image_prompt'],
      453,
      570,
      $this->imageStoragePath
    );

    UserContact::updateOrCreate(
      [
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
      ],
      [
        'contact_form_image' => $image,
        'contact_form_title' => $this->extractCleanTitle($title),
        'contact_form_subtitle' => $this->extractCleanTitle($subtitle),
        'contact_addresses' => $this->extractCleanText($addresses),
        'contact_numbers' => $this->extractCleanText($numbers),
        'contact_mails' => $this->extractCleanText($mails),
        'latitude' => $contactData['latitude'],
        'longitude' => $contactData['longitude'],
        'map_zoom' => $contactData['map_zoom'],
      ]
    );
  }

  private function getContactData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    // Generate realistic coordinates (you can adjust based on region)
    $latitude = number_format(rand(23000000, 24000000) / 1000000, 6); 
    $longitude = number_format(rand(90000000, 91000000) / 1000000, 6);

    return [
      'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
            Generate a welcoming contact section title for {$businessName}.
            Examples: Get In Touch, Contact Us Today, Reach Out Now, Let's Connect
            Output: Just the title, nothing else.
            Context: {$baseContext}",

      'subtitle_prompt' => "You must return EXACTLY 7-8 words. No formatting, no explanation.
            Write an inviting contact section subtitle encouraging visitors to reach out.
            Include: availability, response commitment, friendly tone.
            Examples: We're here to help and answer any questions you might have. We look forward to hearing from you
            Output: Plain text only, 7-8 words.
            Context: {$baseContext}",

      'addresses_prompt' => "You must return realistic business addresses separated by semicolons. No formatting.
            Generate 1-2 professional office addresses for {$businessName} in {$industry}.
            Format: Street Address, City, State/Region ZIP
            Examples: 123 Business Avenue, New York, NY 10001; 456 Corporate Drive, Los Angeles, CA 90001
            Use realistic but fictional addresses. Separate multiple addresses with semicolons.
            Output: Addresses only, separated by semicolons.
            Context: {$baseContext}",

      'numbers_prompt' => "You must return realistic business phone numbers separated by commas. No formatting.
            Generate 1-2 professional contact numbers for {$businessName}.
            Include different departments if applicable (Sales, Support, Main Office).
            Format: +1 (XXX) XXX-XXXX or similar professional format
            Examples: +1 (555) 123-4567, +1 (555) 123-4568
            Use realistic but fictional numbers. Separate with commas.
            Output: Phone numbers only, separated by commas.",

      'mails_prompt' => "You must return realistic business email addresses separated by commas. No formatting.
            Generate 1-2 professional email addresses for {$businessName}.
            Include different purposes (info, support, sales).
            Format: departmentname@companyname.com
            Examples: info@company.com, support@company.com, sales@company.com
            Use lowercase. Base emails on the business name. Separate with commas.
            Output: Email addresses only, separated by commas.
            Business name: {$businessName}",

      'image_prompt' => "Professional office scene for {$industry} contact page: modern reception desk with computer and phone, friendly professional environment, contemporary business interior, clean organized workspace, natural window lighting, plants and professional decor, welcoming atmosphere, corporate photography style, high resolution, MANDATORY: zero text, zero words, zero typography, zero letters visible anywhere, completely text-free image, visual only",


      'latitude' => $latitude,
      'longitude' => $longitude,
      'map_zoom' => 15, 
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
