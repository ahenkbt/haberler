<?php

namespace App\Services\AiWebsite;

use App\Models\User\SEO;
use App\Services\MasterAiGenerator;

class SEOService
{
  protected $ai;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
  }

  public function generate()
  {
    $seoData = $this->getSEOData();

    $seoFields = [];

    // Generate meta keywords and descriptions for all pages
    foreach ($seoData as $pageKey => $data) {
      $keywords = $this->ai->generateText($data['keywords_prompt']);
      $description = $this->ai->generateText($data['description_prompt']);

      // Determine column names based on page
      $columnNames = $this->getColumnNames($pageKey);

      $seoFields[$columnNames['keywords']] = $this->extractCleanText($keywords);
      $seoFields[$columnNames['description']] = $this->extractCleanText($description);
    }

    SEO::updateOrCreate(
      [
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
      ],
      $seoFields
    );
  }

  // Helper method to get correct column names
  private function getColumnNames($pageKey)
  {
    $reverseFormatPages = [
      'signup',
      'login',
      'course_details',
      'course',
      'rooms',
      'room_details'
    ];

    if (in_array($pageKey, $reverseFormatPages)) {
      return [
        'keywords' => 'meta_keyword_' . $pageKey,
        'description' => 'meta_description_' . $pageKey,
      ];
    }

    return [
      'keywords' => $pageKey . '_meta_keywords',
      'description' => $pageKey . '_meta_description',
    ];
  }


  private function getSEOData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      'home' => [
        'keywords_prompt' => "You must return ONLY 8-10 SEO keywords separated by commas. No formatting.
                Generate primary SEO keywords for the home page of {$businessName}.
                Include: business name, industry, main services, location-related if applicable, brand keywords.
                Examples: business name, industry type, main service, best service provider, professional company
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the home page.
                Include: business name, what you do, main value proposition, call to action.
                Make it compelling and keyword-rich.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'services' => [
        'keywords_prompt' => "You must return ONLY 7-10 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the services page.
                Focus on: service types, industry services, professional services, service-related terms.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the services page.
                Highlight: range of services, expertise, quality, client benefits.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'blogs' => [
        'keywords_prompt' => "You must return ONLY 7-9 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the blog page.
                Include: industry blog, insights, articles, news, tips, resources.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the blog page.
                Mention: industry insights, expert articles, latest news, valuable content.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'portfolios' => [
        'keywords_prompt' => "You must return ONLY 7-9 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the portfolio page.
                Include: portfolio, projects, work samples, case studies, client work.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the portfolio page.
                Highlight: successful projects, quality work, client satisfaction, results.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'jobs' => [
        'keywords_prompt' => "You must return ONLY 7-9 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the careers/jobs page.
                Include: careers, jobs, employment, opportunities, hiring, join team.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the careers page.
                Mention: job opportunities, career growth, team culture, apply now.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'team' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the team page.
                Include: team members, leadership, experts, professionals, about team.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the team page.
                Highlight: experienced team, expert professionals, leadership, qualifications.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'faqs' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the FAQ page.
                Include: FAQ, questions, answers, help, support, common queries.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the FAQ page.
                Mention: common questions, helpful answers, quick solutions, support.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'contact' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the contact page.
                Include: contact us, get in touch, reach out, customer support, location.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the contact page.
                Include: contact information, reach us, get support, available to help.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'shop' => [
        'keywords_prompt' => "You must return ONLY 7-9 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the shop/products page.
                Include: online shop, products, buy online, e-commerce, store, shopping.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the shop page.
                Mention: quality products, online shopping, best prices, shop now.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'item_details' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for product details pages.
                Include: product details, specifications, buy product, product features.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for product detail pages.
                Highlight: detailed information, features, specifications, purchase.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'cart' => [
        'keywords_prompt' => "You must return ONLY 5-7 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the shopping cart page.
                Include: shopping cart, my cart, cart items, checkout, purchase.
                Output: Comma-separated keywords only.",

        'description_prompt' => "You must return EXACTLY 140-150 characters. No formatting.
                Write an SEO meta description for the cart page.
                Output: Plain text only, 140-150 characters.",
      ],
      'checkout' => [
        'keywords_prompt' => "You must return ONLY 5-7 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the checkout page.
                Include: checkout, secure payment, complete order, buy now.
                Output: Comma-separated keywords only.",

        'description_prompt' => "You must return EXACTLY 140-150 characters. No formatting.
                Write an SEO meta description for the checkout page.
                Output: Plain text only, 140-150 characters.",
      ],
      'signup' => [
        'keywords_prompt' => "You must return ONLY 5-7 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the signup page.
                Include: sign up, register, create account, join, membership.
                Output: Comma-separated keywords only.",

        'description_prompt' => "You must return EXACTLY 140-150 characters. No formatting.
                Write an SEO meta description for the signup page.
                Output: Plain text only, 140-150 characters.",
      ],
      'login' => [
        'keywords_prompt' => "You must return ONLY 5-7 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for the login page.
                Include: login, sign in, member login, access account, user login.
                Output: Comma-separated keywords only.",

        'description_prompt' => "You must return EXACTLY 140-150 characters. No formatting.
                Write an SEO meta description for the login page.
                Output: Plain text only, 140-150 characters.",
      ],
      'course' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for courses page.
                Include: courses, online learning, training, education, classes.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the courses page.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'course_details' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for course details pages.
                Include: course details, curriculum, enroll, online course, learning.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for course detail pages.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'rooms' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for rooms/accommodations page.
                Include: rooms, accommodation, booking, hotel rooms, stay.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for the rooms page.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
      ],
      'room_details' => [
        'keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
                Generate SEO keywords for room details pages.
                Include: room details, amenities, book room, accommodation features.
                Output: Comma-separated keywords only.
                Context: {$baseContext}",

        'description_prompt' => "You must return EXACTLY 60-70 characters. No formatting.
                Write an SEO meta description for room detail pages.
                Output: Plain text only, 60-70 characters.
                Context: {$baseContext}",
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
