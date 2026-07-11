<?php

namespace App\Services\AiWebsite\GalleryManagement;

use App\Models\User\GalleryCategory;
use App\Services\MasterAiGenerator;

class GalleryCategoryService
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
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      GalleryCategory::where('user_id', $userId)->delete();
    }

    $categoryData = $this->getCategoryData();

    foreach ($categoryData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);

      GalleryCategory::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'name' => $this->extractCleanTitle($name),
        'status' => 1,
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getCategoryData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    if ($this->ai->getTheme() == 'home_thirteen') {
      return [

        [
          'name_prompt' => "2-3 words ONLY. Gallery for venue/environment photos.
                    Examples: Our Space, Elegant Venue, Premium Setting
                    Use: {$baseContext}
                    NO office/team. Just name.",
        ],
        [
          'name_prompt' => "2-3 words ONLY. Gallery for people/experience photos.
                    Examples: Guest Moments, Client Stories, Special People
                    Use: {$baseContext}
                    NO generic team. Just name.",
        ],

        [
          'name_prompt' => "Return ONLY ONE gallery category name. 
        Max 2-3 words, no commas, no list, no quotes.
        This is for events and celebrations photos.
        Good examples: Event Highlights, Special Moments, Celebration Gallery.
        Bad examples: Momentos,Festivities,Highlight,zest,Joy,Revel,Soirée,Celebrate,Fiesta,Fête.
        Business context: {$baseContext}",
        ],

        [
          'name_prompt' => "2-3 words ONLY. Gallery for featured work/showcase.
                    Examples: Signature Work, Highlight Collection, Premium Showcase
                    Use: {$baseContext}
                    NO projects. Just name.",
        ],
      ];
    } else {
      return [
        [
          'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a gallery category name for office/workplace photos in {$industry}.
                Examples: Office Space, Workplace Environment, Our Office, Work Culture
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
        ],
        [
          'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a gallery category name for team/employee photos.
                Examples: Our Team, Team Members, Company Culture, People
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
        ],
        [
          'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a gallery category name for events and celebrations.
                Examples: Company Events, Celebrations, Special Occasions, Event Highlights
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
        ],
        [
          'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a gallery category name for projects/work samples in {$industry}.
                Examples: Our Projects, Project Gallery, Work Samples, Client Work
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
        ],
      ];
    }
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    return trim($text);
  }
}
