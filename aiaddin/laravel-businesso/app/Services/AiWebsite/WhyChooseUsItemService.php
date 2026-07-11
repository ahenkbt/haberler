<?php

namespace App\Services\AiWebsite;

use Illuminate\Support\Facades\DB;
use App\Services\MasterAiGenerator;

class WhyChooseUsItemService
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

    // Delete old Why Choose Us item records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      DB::table('user_choose_us_items')
        ->where('user_id', $userId)
        ->delete();
    }

    $items = $this->getItemDefinitions();

    foreach ($items as $index => $def) {
   
      $rawTitle = $this->ai->generateText($def['title_prompt']);
      $rawContent = $this->ai->generateText($def['content_prompt']);

      $title = $this->extractCleanTitle($rawTitle);
      $content = $this->extractCleanText($rawContent);

      DB::table('user_choose_us_items')->insert([
        'user_id'       => $this->ai->getUserId(),
        'language_id'   => $this->ai->getDefaultLanguageId(),
        'icon'          => $def['icon'],           
        'title'         => $title,
        'content'       => $content,
        'serial_number' => $index + 1,
        'created_at'    => now(),
        'updated_at'    => now(),
      ]);
    }
  }

  /**
   * Prompt definitions for each Why Choose Us item.
   */
  private function getItemDefinitions(): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'icon' => 'fas fa-award',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a strong benefit-based title for a 'Why Choose Us' item highlighting experience and proven results for {$businessName} in {$industry}.
                Examples: Years Of Proven Experience, Trusted Industry Experts, Consistent Quality Results
                Output: Just the title text, nothing else.
                Context: {$baseContext}",

        'content_prompt' => "You must return EXACTLY 10-15 words. No formatting, no explanation.
                Write a short paragraph explaining why {$businessName}'s experience and track record make it a reliable choice in {$industry}.
                Focus on: years in business, successful projects, client satisfaction.
                Output: Plain text only, 10-15 words.
                Context: {$baseContext}",
      ],
      [
        'icon' => 'fas fa-users-cog',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a benefit-based title for a 'Why Choose Us' item about expert, dedicated team.
                Examples: Expert Dedicated Team, Skilled Professionals Only, Passionate Industry Specialists
                Output: Just the title text, nothing else.
                Context: {$baseContext}",

        'content_prompt' => "You must return EXACTLY 10-15 words. No formatting, no explanation.
                Write a short paragraph describing the expertise, skills, and dedication of {$businessName}'s team.
                Mention: qualified professionals, diverse skills, client-focused mindset.
                Output: Plain text only, 10-15 words.
                Context: {$baseContext}",
      ],
      [
        'icon' => 'fas fa-handshake',
        'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a title for a 'Why Choose Us' item about client-focused service and support.
                Examples: Client First Approach, Reliable Ongoing Support, Your Success Our Priority
                Output: Just the title text, nothing else.
                Context: {$baseContext}",

        'content_prompt' => "You must return EXACTLY 10-15 words. No formatting, no explanation.
                Write a paragraph showing how {$businessName} cares about clients, supports them, and builds long-term relationships.
                Emphasize: communication, responsiveness, understanding client needs.
                Output: Plain text only, 10-15 words.
                Context: {$baseContext}",
      ],
    ];
  }

 
  private function extractCleanTitle(string $text): string
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = trim($text);

    if (strlen($text) > 60) {
      $text = substr($text, 0, 60);
    }

    return $text;
  }

  private function extractCleanText(string $text): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]">]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/m', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
