<?php

namespace App\Traits;

use App\Models\BasicSettings\PageHeading;
use App\Models\Language;
use App\Models\User\Language as UserLanguage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\URL;

trait MiscellaneousTrait
{
  public static function getLanguage()
  {
    // get the current locale of this system
    if (Session::has('currentLocaleCode')) {
      $locale = Session::get('currentLocaleCode');
    }

    if (empty($locale)) {
      $language = Language::where('is_default', 1)->first();
    } else {
      $language = Language::where('code', $locale)->first();
    }
    if (empty($language)) {
      $language = Language::where('is_default', 1)->first();
    }

    return $language;
  }
  public static function getCustomerCurrentLanguage()
  {
    // get the current locale of this system
    if (Session::has('user_midtrans')) {
      $user = Session::get('user_midtrans');
    } else {
      $user = getUser();
    }
    if (session()->has('user_lang')) {
      $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
      if (empty($userCurrentLang)) {
        $userCurrentLang = UserLanguage::where('dashboard_default', 1)->where('user_id', $user->id)->first();
        session()->put(
          'user_lang',
          $userCurrentLang->code
        );
      }
    } else {
      $userCurrentLang = UserLanguage::where('dashboard_default', 1)->where('user_id', $user->id)->first();
    }

    return $userCurrentLang;
  }


  // public static function getBreadcrumb()
  // {
  //   $breadcrumb = DB::table('basic_settings')->select('breadcrumb')
  //     ->where('uniqid', '=', 12345)
  //     ->first();

  //   return $breadcrumb;
  // }

  // public static function getPageHeading($language)
  // {
  //   if (URL::current() == Route::is('rooms')) {
  //     $pageHeading = PageHeading::select('rooms_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('services')) {
  //     $pageHeading = PageHeading::select('services_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('blogs')) {
  //     $pageHeading = PageHeading::select('blogs_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('gallery')) {
  //     $pageHeading = PageHeading::select('gallery_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('packages')) {
  //     $pageHeading = PageHeading::select('packages_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('faqs')) {
  //     $pageHeading = PageHeading::select('faqs_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   } else if (URL::current() == Route::is('contact')) {
  //     $pageHeading = PageHeading::select('contact_us_title')
  //       ->where('language_id', $language->id)
  //       ->first();
  //   }

  //   return $pageHeading;
  // }

  public static function getCurrencyInfo($userId)
  {
    $baseCurrencyInfo = DB::table('user_basic_settings')->where('user_id', $userId)
      ->select('base_currency_symbol', 'base_currency_symbol_position', 'base_currency_text', 'base_currency_text_position', 'base_currency_rate')
      ->first();

    return $baseCurrencyInfo;
  }
}
