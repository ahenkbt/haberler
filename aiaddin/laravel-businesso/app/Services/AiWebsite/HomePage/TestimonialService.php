<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\UserTestimonial;
use App\Services\MasterAiGenerator;

class TestimonialService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/testimonials/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate($includeImage = true)
  {

    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldTestimonials = UserTestimonial::where('user_id', $userId)->get();

      foreach ($oldTestimonials as $testimonial) {
        if ($testimonial->image && file_exists(public_path($this->imageStoragePath . $testimonial->image))) {
          @unlink(public_path($this->imageStoragePath . $testimonial->image));
        }
      }
      UserTestimonial::where('user_id', $userId)->delete();
    }

    $testimonialData = $this->getTestimonialData();

    foreach ($testimonialData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);
      $content = $this->ai->generateText($data['content_prompt']);

      $testimonialInput = [
        'user_id' => $this->ai->getUserId(),
        'lang_id' => $this->ai->getDefaultLanguageId(),
        'name' => $this->extractCleanTitle($name),
        'content' => $this->extractCleanTitle($content),
        'occupation' => $data['occupation'],
        'serial_number' => $index + 1,
      ];

      // Generate image only if theme requires it
      if ($includeImage) {
        $image = $this->ai->generateImage(
          $data['image_prompt'],
          300,
          300,
          $this->imageStoragePath
        );
        $testimonialInput['image'] = $image;
      }

      UserTestimonial::create($testimonialInput);
    }
  }

  private function getTestimonialData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional client name for a testimonial.
                Examples: John Anderson, Sarah Mitchell, Michael Chen, Emma Rodriguez
                Output: Just the name, nothing else.",

        'content_prompt' => "You must return EXACTLY 15-20 words. No formatting, no quotes.
                Write a genuine, enthusiastic testimonial from a satisfied client of {$businessName}.
                Focus on: excellent service quality, professional team, and positive results.
                Use first-person perspective (I, we, our). Be specific and authentic.
                Output: Plain text only, 15-20 words.
                Context: {$baseContext}",

        'occupation' => $this->generateOccupation($industry, 'CEO'),

        'image_prompt' => "Professional headshot photo of a business CEO, confident and friendly expression, corporate attire, clean white or neutral background, high quality portrait photography, professional lighting",
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional client name for a testimonial.
                Output: Just the name, nothing else.",

        'content_prompt' => "You must return EXACTLY 15-20 words. No formatting, no quotes.
                Write a genuine testimonial from a client praising {$businessName}'s expertise in {$industry}.
                Highlight: timely delivery, innovative solutions, and excellent communication.
                Use first-person perspective. Be specific and credible.
                Output: Plain text only, 15-20 words.
                Context: {$baseContext}",

        'occupation' => $this->generateOccupation($industry, 'Marketing Director'),

        'image_prompt' => "Professional business portrait of a marketing director, approachable smile, modern business casual attire, clean background, corporate photography style, natural professional lighting",
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional client name for a testimonial.
                Output: Just the name, nothing else.",

        'content_prompt' => "You must return EXACTLY 15-20 words. No formatting, no quotes.
                Write an authentic testimonial praising {$businessName}'s customer service and reliability.
                Mention: responsive support, problem-solving ability, and long-term partnership value.
                Use first-person perspective. Sound genuine and detailed.
                Output: Plain text only, 15-20 words.
                Context: {$baseContext}",

        'occupation' => $this->generateOccupation($industry, 'Operations Manager'),

        'image_prompt' => "Professional headshot of a business operations manager, confident and professional demeanor, formal business attire, neutral clean background, high-end corporate portrait style",
      ],
    ];
  }

  private function generateOccupation($industry, $defaultTitle)
  {
    $titles = [
      'CEO & Founder',
      'Marketing Director',
      'Operations Manager',
      'Product Manager',
      'Business Owner',
      'Project Lead',
      'Chief Technology Officer',
      'Creative Director',
      'Head of Digital',
      'Managing Director'
    ];

    return $titles[array_rand($titles)];
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
