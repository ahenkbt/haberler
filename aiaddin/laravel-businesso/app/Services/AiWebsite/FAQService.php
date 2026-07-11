<?php

namespace App\Services\AiWebsite;

use App\Models\User\FAQ;
use App\Services\MasterAiGenerator;

class FAQService
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
    // delete old FAQ records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      FAQ::where('user_id', $userId)->delete();
    }

    $faqData = $this->getFAQData();

    foreach ($faqData as $index => $data) {
      $question = $this->ai->generateText($data['question_prompt']);
      $answer = $this->ai->generateText($data['answer_prompt']);

      FAQ::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'question' => $this->extractCleanText($question),
        'answer' => $this->extractCleanText($answer),
        'featured' => $data['featured'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getFAQData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'question_prompt' => "You must return ONLY ONE question of 8-12 words. No formatting, no explanation.
                Generate a common FAQ question about the services offered by {$businessName} in {$industry}.
                Format as a natural question with question mark.
                Examples: What services does your company provide?, How can you help my business?
                Output: Just the question, nothing else.
                Context: {$baseContext}",

        'answer_prompt' => "You must return EXACTLY 40-50 words. No formatting, no explanation.
                Write a clear, helpful answer about the services offered by {$businessName}.
                Include: key services, unique approach, value proposition.
                Use professional, friendly tone. Be specific and informative.
                Output: Plain text only, 40-50 words.
                Context: {$baseContext}",

        'featured' => 1,
      ],
      [
        'question_prompt' => "You must return ONLY ONE question of 8-12 words. No formatting, no explanation.
                Generate a FAQ question about pricing or cost for {$industry} services.
                Format as a natural question with question mark.
                Examples: How much do your services cost?, What are your pricing plans?
                Output: Just the question, nothing else.
                Context: {$baseContext}",

        'answer_prompt' => "You must return EXACTLY 40-50 words. No formatting, no explanation.
                Write an informative answer about pricing approach for {$businessName}.
                Include: pricing structure, factors affecting cost, consultation availability.
                Be transparent and helpful without giving exact prices.
                Output: Plain text only, 40-50 words.
                Context: {$baseContext}",

        'featured' => 0,
      ],
      [
        'question_prompt' => "You must return ONLY ONE question of 8-12 words. No formatting, no explanation.
                Generate a FAQ question about project timeline or delivery for {$industry} services.
                Format as a natural question with question mark.
                Examples: How long does a typical project take?, What is your turnaround time?
                Output: Just the question, nothing else.
                Context: {$baseContext}",

        'answer_prompt' => "You must return EXACTLY 40-50 words. No formatting, no explanation.
                Write a practical answer about project timelines for {$businessName}.
                Include: typical timeframes, factors affecting duration, commitment to deadlines.
                Be realistic and professional.
                Output: Plain text only, 40-50 words.
                Context: {$baseContext}",

        'featured' => 1,
      ],
    ];
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
