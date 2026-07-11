<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\CounterInformation;
use App\Services\MasterAiGenerator;

class CounterInformationService
{
  protected $ai;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
  }

  public function generate()
  {

    // Delete previous counter information records for this user
    CounterInformation::where('user_id', $this->ai->getUserId())->delete();

    $counterData = $this->getCounterData();

    $theme = $this->ai->getTheme(); 
    $limit = ($theme === 'home_nine') ? 3 : count($counterData);
    $counterData = array_slice($counterData, 0, $limit);

    foreach ($counterData as $index => $data) {
      $count = $this->ai->generateText($data['count_prompt']);
      $title = $this->ai->generateText($data['title_prompt']);

      $cleanTitle = $this->extractCleanTitle($title);

      // Generate icon class based on the generated title using AI
      $iconPrompt = "Based on this counter title: '{$cleanTitle}', return ONLY a Font Awesome 5 icon class that best represents this title. Return format: 'fas fa-icon-name'. No explanation, no extra text, just the icon class.

      Examples:
      - For 'Years Experience': fas fa-award
      - For 'Happy Customers': fas fa-smile
      - For 'Global Reach': fas fa-globe
      - For 'Positive Reviews': fas fa-star
      - For 'Team Members': fas fa-users
      - For 'Community Engagement': fas fa-comments

      Now return the icon class for: '{$cleanTitle}'";

      $icon = $this->ai->generateText($iconPrompt);

      CounterInformation::create([
        'user_id'       => $this->ai->getUserId(),
        'language_id'   => $this->ai->getDefaultLanguageId(),
        'count'         => $this->extractNumber($count),
        'title'         => $cleanTitle,
        'icon'          => $this->extractIconClass($icon),
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getCounterData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'count_prompt' => "You must return ONLY a single number between 10-50. No text, no explanation, just the number. Generate a realistic number representing years of experience for {$businessName}. Context: {$baseContext}",

        'title_prompt' => "You must return ONLY ONE label phrase of 2-3 words. Do not provide multiple options or suggestions. 
        Choose the SINGLE BEST label for a years of experience counter for {$businessName}.
        Output format: Just the phrase, nothing else. No bullets, no 'Here are', no options.
        Good examples: Years Experience, Years Serving, Industry Leader
        Context: {$baseContext}",

      ],
      [
        'count_prompt' => "You must return ONLY a single number between 500-5000. No text, no explanation, just the number. Generate a realistic number representing happy customers or completed projects for {$businessName}. Context: {$baseContext}",

        'title_prompt' => "You must return ONLY ONE label phrase of 2-3 words. Do not provide multiple options or suggestions.
        Choose the SINGLE BEST label for a happy customers counter for {$businessName}.
        Output format: Just the phrase, nothing else. No bullets, no 'Here are', no options.
        Good examples: Happy Customers, Satisfied Clients, Completed Projects
        Context: {$baseContext}",

      ],
      [
        'count_prompt' => "You must return ONLY a single number between 20-150. No text, no explanation, just the number. Generate a realistic number representing countries served by {$businessName}. Context: {$baseContext}",

        'title_prompt' => "You must return ONLY ONE label phrase of 2-3 words. Do not provide multiple options or suggestions.
        Choose the SINGLE BEST label for a countries counter for {$businessName}.
        Output format: Just the phrase, nothing else. No bullets, no 'Here are', no options.
        Good examples: Countries Served, Global Reach, Countries Worldwide
        Context: {$baseContext}",

      ],
      [
        'count_prompt' => "You must return ONLY a single number between 100-2000. No text, no explanation, just the number. Generate a realistic number representing positive reviews or testimonials for {$businessName}. Context: {$baseContext}",

        'title_prompt' => "You must return ONLY ONE label phrase of 2-3 words. Do not provide multiple options or suggestions.
        Choose the SINGLE BEST label for a positive reviews counter for {$businessName}.
        Output format: Just the phrase, nothing else. No bullets, no 'Here are', no options.
        Good examples: Positive Reviews, Five Star Ratings, Happy Testimonials
        Context: {$baseContext}",
      ],
    ];
  }

  private function extractIconClass($text)
  {

    $text = trim($text);

    if (preg_match('/(fa[srlb]\s+fa-[\w-]+)/', $text, $matches)) {
      return $matches[1];
    }

    return 'fas fa-check-circle';
  }

  private function extractNumber($text)
  {
    preg_match('/\d+/', $text, $matches);
    return isset($matches[0]) ? (int) $matches[0] : 0;
  }

  private function extractCleanTitle($text)
  {
    // Remove common AI formatting patterns
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/^\*+\s*/', '', $text);
    $text = preg_replace('/^-\s*/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
