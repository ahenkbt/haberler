<?php

namespace App\Http\Helpers;

class AiPageFilterHelper
{
  /**
   * Filter request pages based on package allowed AI pages
   *
   * @param array|null 
   * @param array|null 
   * @return array 
   */
  public static function filter(?array $requestPages, ?array $packageAiPages): array
  {
    if (!is_array($requestPages) || !is_array($packageAiPages)) {
      return [];
    }

    // label map
    $pageMap = [
      'home'       => 'Home Page',
      'about'      => 'About Page',
      'services'   => 'Services Page',
      'team'       => 'Team Page',
      'career'     => 'Career Page',
      'faq'        => 'FAQ Page',
      'gallery'    => 'Gallery Page',
      'blog'       => 'Blog Page',
      'portfolios' => 'Portfolio Page',
      'contact'    => 'Contact Page',
      'shop'       => 'Shop Page',
      'courses'    => 'Course Page',
      'rooms'      => 'Room Page',
      'causes'     => 'Cause Page',
    ];

    // normalize request pages
    $requestPages = array_map(
      fn($p) => strtolower(trim($p)),
      $requestPages
    );

    // allowed slugs from package
    $allowedSlugs = [];
    foreach ($pageMap as $slug => $label) {
      if (in_array($label, $packageAiPages, true)) {
        $allowedSlugs[] = $slug;
      }
    }

    // final filtered pages
    return array_values(array_intersect($requestPages, $allowedSlugs));
  }
}
