<?php

use App\Http\Controllers\User\HotelBooking\RoomController;
use App\Http\Controllers\User\HotelBooking\RoomManagementController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;

// Railway / Docker sağlık kontrolü: Host === WEBSITE_HOST eşleşmese bile 200 döner.
// Teşhis (Railway): AIADDIN_DIAG_SECRET değişkeni + istek başlığı X-Aiaddin-Diag: <aynı gizli>
Route::get('/healthz', static function () {
    $secret = config('aiaddin.diag_secret');
    if (!empty($secret) && request()->header('X-Aiaddin-Diag') === $secret) {
        $out = [
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'storage_installed' => file_exists(storage_path('installed')),
        ];
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            $out['db'] = 'connected';
            $out['languages_count'] = \App\Models\Language::query()->count();
            $out['basic_settings_count'] = \App\Models\BasicSetting::query()->count();
        } catch (\Throwable $e) {
            $out['db'] = 'error';
            $out['db_message'] = $e->getMessage();
        }

        return response()->json($out, 200, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    return response('OK', 200);
});

// Ana rotalar tek Route::domain() içinde: gelen Host mutlaka bu değerle uyumlu olmalı.
// Railway public URL + özel alan (APP_URL) farklı host olabildiği için ikisini de eşleştiriyoruz.
$domain = (string) env('WEBSITE_HOST');
$appHost = parse_url((string) env('APP_URL', ''), PHP_URL_HOST) ?: null;

if (!app()->runningInConsole()) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($host !== '') {
        if ($appHost && ($host === $appHost || $host === 'www.' . $appHost)) {
            $domain = str_starts_with($host, 'www.') ? $host : $appHost;
        } elseif (str_starts_with($host, 'www.')) {
            $base = substr($host, 4);
            if ($base === $domain || ($appHost && $base === $appHost)) {
                $domain = $host;
            }
        }
    }
}

if ($domain === '') {
    $domain = $appHost ?: 'localhost';
}
Route::fallback(function () {
    return view('errors.404');
})->middleware('setlang');


// Cron / periyodik işler: üretimde CRON_SECRET + header X-Cron-Secret veya ?token= (bkz. docs/BUSINESSO_GUVENLIK.md)
Route::middleware(['cron.secret'])->group(function () {
    Route::get('/subcheck', 'CronJobController@expired')->name('cron.expired');
    Route::get('/check-payment', 'CronJobController@check_payment')->name('cron.check_payment');
});


Route::get('/midtrans/bank-notify', 'MidtransBankNotifyController@bank_notify')->name('midtrans.bank_notify');
Route::get('/midtrans/cancel', 'MidtransBankNotifyController@cancel')->name('midtrans.cancel');

Route::get('/myfatoorah/callback', 'MyFatoorahController@callback')->name('myfatoorah.success');
Route::get('myfatoorah/cancel', 'MyFatoorahController@cancel')->name('myfatoorah.cancel');

Route::domain($domain)->group(function () {
    Route::get('/changelanguage/{lang}', 'Front\FrontendController@changeLanguage')->name('changeLanguage');
    Route::middleware(['cron.secret'])->group(function () {
        Route::get('/expired', 'CronJobController@expired')->name('cron.expired.domain');
        Route::get('/expiry-reminder', 'CronJobController@expired')->name('cron.expiry-reminder');
    });

    Route::group(['middleware' => 'setlang'], function () {
        Route::get('/', 'Front\FrontendController@index')->name('front.index');
        Route::get('/templates', 'Front\FrontendController@templates')->name('front.templates');
        Route::get('/vcards', 'Front\FrontendController@vcards')->name('front.vcards');
        Route::post('/subscribe', 'Front\FrontendController@subscribe')->name('front.subscribe');
        Route::get('/listings', 'Front\FrontendController@users')->name('front.user.view');
        Route::get('/contact', 'Front\FrontendController@contactView')->name('front.contact');
        Route::get('/faq', 'Front\FrontendController@faqs')->name('front.faq.view');
        Route::get('/blog', 'Front\FrontendController@blogs')->name('front.blogs');
        Route::get('/pricing', 'Front\FrontendController@pricing')->name('front.pricing');
        Route::get('/blog-details/{slug}/{id}', 'Front\FrontendController@blogdetails')->name('front.blogdetails');
        Route::get('/registration/step-1/{status}/{id}', 'Front\FrontendController@step1')->name('front.register.view');
        Route::get('/check/{username}/username', 'Front\FrontendController@checkUsername')->name('front.username.check');
        Route::get('/p/{slug}', 'Front\FrontendController@dynamicPage')->name('front.dynamicPage');
        Route::get('/success', 'Front\CheckoutController@onlineSuccess')->name('success.page');
    });

    Route::group(['middleware' => ['web', 'guest', 'setlang']], function () {
        Route::get('/registration/final-step', 'Front\FrontendController@step2')->name('front.registration.step2');
        Route::post('/checkout', 'Front\FrontendController@checkout')->name('front.checkout.view');
        Route::get('/login', 'User\Auth\LoginController@showLoginForm')->name('user.login');
        Route::post('/login', 'User\Auth\LoginController@login')->name('user.login.submit');
        Route::get('/register', 'User\Auth\RegisterController@registerPage')->name('user-register');
        Route::post('/register/submit', 'User\Auth\RegisterController@register')->name('user-register-submit')->middleware('Demo');
        Route::get('/register/mode/{mode}/verify/{token}', 'User\Auth\RegisterController@token')->name('user-register-token');

        Route::post('/password/email', 'User\Auth\ForgotPasswordController@sendResetLinkEmail')->name('user.forgot.password.submit')->middleware('Demo');
        Route::get('/password/reset', 'User\Auth\ForgotPasswordController@showLinkRequestForm')->name('user.forgot.password.form');
        Route::post('/password/reset', 'User\Auth\ResetPasswordController@reset')->name('user.reset.password.submit')->middleware('Demo');
        Route::get('/password/reset/{token}/email/{email}', 'User\Auth\ResetPasswordController@showResetForm')->name('user.reset.password.form');

        Route::get('/forgot', 'User\ForgotController@showforgotform')->name('user-forgot');
        Route::post('/forgot', 'User\ForgotController@forgot')->name('user-forgot-submit')->middleware('Demo');
    });

    /*=======================================================
    ******************* User Routes *************************
    =======================================================*/

    Route::group(['prefix' => 'user', 'middleware' => ['auth', 'userstatus', 'Demo', 'setUserLang']], function () {
        // user theme change
        Route::get('/change-theme', 'User\UserController@changeTheme')->name('user.theme.change');
        Route::get('/change-language', 'User\UserController@changeLanguage')->name('user.change.language');
        // RTL check
        Route::get('/rtlcheck/{langid}', 'User\LanguageController@rtlcheck')->name('user.rtlcheck');
        Route::get('/dashboard', 'User\UserController@index')->name('user-dashboard');
        Route::get('/reset', 'User\UserController@resetform')->name('user-reset');
        Route::post('/reset', 'User\UserController@reset')->name('user-reset-submit');
        Route::get('/profile', 'User\UserController@profile')->name('user-profile');
        Route::post('/profile', 'User\UserController@profileupdate')->name('user-profile-update');
        Route::get('/logout', 'User\Auth\LoginController@logout')->name('user-logout');
        Route::post('/change-status', 'User\UserController@status')->name('user-status');
        // Payment Log
        Route::get('/payment-log', 'User\PaymentLogController@index')->name('user.payment-log.index');
        // User Domains & URLs
        Route::group(['middleware' => 'checkUserPermission:Custom Domain'], function () {
            Route::get('/domains', 'User\DomainController@domains')->name('user-domains');
            Route::post('/request/domain', 'User\DomainController@domainrequest')->name('user-domain-request');
        });
        // User Subdomains & URLs
        Route::get('/subdomain', 'User\SubdomainController@subdomain')->name('user-subdomain');
        //user follow and following list
        Route::group(['middleware' => 'checkUserPermission:Follow/Unfollow'], function () {
            Route::get('/follower-list', 'User\FollowerController@follower')->name('user.follower.list');
            Route::get('/following-list', 'User\FollowerController@following')->name('user.following.list');
            Route::get('/follow/{id}', 'User\FollowerController@follow')->name('user.follow');
            Route::get('/unfollow/{id}', 'User\FollowerController@unfollow')->name('user.unfollow');
        });
        Route::get('/change-password', 'User\UserController@changePass')->name('user.changePass');
        Route::post('/profile/updatePassword', 'User\UserController@updatePassword')->name('user.updatePassword');

        // User Feature Routes
        Route::get('/features', 'User\FeatureController@index')->name('user.feature.index');
        Route::post('/feature/store', 'User\FeatureController@store')->name('user.feature.store');
        Route::get('/feature/{id}/edit', 'User\FeatureController@edit')->name('user.feature.edit');
        Route::post('/feature/update', 'User\FeatureController@update')->name('user.feature.update');
        Route::post('/feature/image/update', 'User\FeatureController@imageUpdate')->name('user.feature.image_update');
        Route::post('/feature/delete', 'User\FeatureController@delete')->name('user.feature.delete');
        // User Top Offer Banner
        Route::get('/offer-banner', 'User\OfferBannerController@index')->name('user.offerBanner.index');
        Route::post('/offer-banner/store', 'User\OfferBannerController@store')->name('user.offerBanner.store');
        Route::get('/offer-banner/{id}/edit', 'User\OfferBannerController@edit')->name('user.offerBanner.edit');
        Route::post('/offer-banner/update', 'User\OfferBannerController@update')->name('user.offerBanner.update');
        Route::post('/offer-banner/delete', 'User\OfferBannerController@delete')->name('user.offerBanner.delete');
        //user language
        Route::get('/languages', 'User\LanguageController@index')->name('user.language.index');
        Route::get('/language/{id}/edit', 'User\LanguageController@edit')->name('user.language.edit');
        Route::get('/language/{id}/edit/keyword', 'User\LanguageController@editKeyword')->name('user.language.editKeyword');

        // Route::post('/language/{id}/add/keyword', 'Admin\LanguageController@addKeyword')->name('admin.language.addKeyword');

        Route::post('/language/{id}/update/keyword', 'User\LanguageController@updateKeyword')->name('user.language.updateKeyword');
        Route::post('/language/store', 'User\LanguageController@store')->name('user.language.store');
        Route::post('/language/upload', 'User\LanguageController@upload')->name('user.language.upload');
        Route::post('/language/{id}/uploadUpdate', 'User\LanguageController@uploadUpdate')->name('user.language.uploadUpdate');
        Route::post('/language/{id}/default', 'User\LanguageController@default')->name('user.language.default');
        Route::post('/language/{id}/dashboard-default', 'User\LanguageController@dashboardDefault')->name('user.language.dashboardDefault');
        Route::post('/language/{id}/delete', 'User\LanguageController@delete')->name('user.language.delete');
        Route::post('/language/update', 'User\LanguageController@update')->name('user.language.update');
        //user color
        Route::get('color', 'User\ColorController@index')->name('user.color.index');
        Route::post('color/update', 'User\ColorController@update')->name('user.color.update');
        //user custom css
        Route::get('css', 'User\CssController@index')->name('user.css.index');
        Route::post('css/update', 'User\CssController@update')->name('user.css.update');

        Route::get('/theme/version', 'User\BasicController@themeVersion')->name('user.theme.version');
        Route::post('/theme/update_version', 'User\BasicController@updateThemeVersion')->name('user.theme.update');
        //user favicon routes
        Route::get('/favicon', 'User\BasicController@favicon')->name('user.favicon');
        Route::post('/favicon/post', 'User\BasicController@updatefav')->name('user.favicon.update');
        //user general setting
        Route::get('/general-settings', 'User\BasicController@generalSettings')->name('user.basic_settings.general-settings');
        Route::post('general-settings/updateinfo', 'User\BasicController@updateInfo')->name('user.general_settings.update_info');

        // user logo routes
        Route::get('/logo', 'User\BasicController@logo')->name('user.logo');
        Route::post('/logo/post', 'User\BasicController@updatelogo')->name('user.logo.update');
        // user breadcrumb route
        Route::get('/breadcrumb', 'User\BasicController@breadcrumb')->name('user.breadcrumb');
        Route::post('/update_breadcrumb', 'User\BasicController@updateBreadcrumb')->name('user.update_breadcrumb');

        // basic settings plugins route start
        Route::group(['middleware' => 'checkUserPermission:Plugins'], function () {
            Route::get('/plugins', 'User\BasicController@plugins')->name('user.plugins');
            Route::post('/update-analytics', 'User\BasicController@updateAnalytics')->name('user.update_analytics');
            Route::post('/basic-settings/update-recaptcha', 'User\BasicController@updateRecaptcha')->name('user.basic_settings.update_recaptcha');
            Route::post('/update-whatsapp', 'User\BasicController@updateWhatsApp')->name('user.update_whatsapp');
            Route::post('/update-disqus', 'User\BasicController@updateDisqus')->name('user.update_disqus');
            Route::post('/update-pixel', 'User\BasicController@updatePixel')->name('user.update_pixel');
            Route::post('/update-tawkto', 'User\BasicController@updateTawkto')->name('user.update_tawkto');
        });
        
        // basic settings plugins route end
        //user contact page route
        Route::get('/contact', 'User\ContactController@index')->name('user.contact');
        Route::post('/contact/update/{language}', 'User\ContactController@update')->name('user.contact.update');
        // user preloader routes
        Route::get('/preloader', 'User\BasicController@preloader')->name('user.preloader');
        Route::post('/preloader/post', 'User\BasicController@updatepreloader')->name('user.preloader.update');
        // basic settings seo route
        Route::get('/basic_settings/seo', 'User\BasicController@seo')->name('user.basic_settings.seo');
        Route::post('/basic_settings/update_seo_informations', 'User\BasicController@updateSEO')->name('user.basic_settings.update_seo_informations');

        // User Cookie Alert Routes
        Route::get('/cookie-alert', 'User\BasicController@cookieAlert')->name('user.cookie.alert');
        Route::post('/cookie-alert/update', 'User\BasicController@updateCookie')->name('user.cookie.update');

        // user mail information
        Route::get('/mail/information/subscriber', 'User\SubscriberController@getMailInformation')->name('user.mail.information');
        Route::post('/mail/information/subscriber', 'User\SubscriberController@storeMailInformation')->name('user.mail.subscriber');
        Route::group(['middleware' => 'checkUserPermission:Ecommerce|Hotel Booking|Course Management|Donation Management'], function () {
            Route::get('/edit_mail_template/{id}', 'User\MailTemplateController@editMailTemplate')->name('user.basic_settings.edit_mail_template');
            Route::get('/mail_templates', 'User\MailTemplateController@mailTemplates')->name('user.basic_settings.mail_templates');
            Route::post('/update_mail_template/{id}', 'User\MailTemplateController@updateMailTemplate')->name('user.basic_settings.update_mail_template');
        });

        Route::get('/menu-builder', 'User\MenuBuilderController@index')->name('user.menu_builder.index');
        Route::post('/menu-builder/update', 'User\MenuBuilderController@update')->name('user.menu_builder.update');

        // user home page routes
        Route::get('/home-page-text/edit', 'User\BasicController@homePageTextEdit')->name('user.home.page.text.edit');
        Route::post('/home-page-text/update', 'User\BasicController@homePageTextUpdate')->name('user.home.page.text.update');
        Route::get('/home-page/about', 'User\BasicController@homePageAbout')->name('user.home.page.about');
        Route::post('/home-page/update_about', 'User\BasicController@homePageAboutUpdate')->name('user.home.page.update.about');
        Route::get('/home-page/video', 'User\BasicController@homePageVideo')->name('user.home.page.video');
        Route::post('/home-page/update_video', 'User\BasicController@homePageUpdateVideo')->name('user.home.page.update.video');
        // call to action section
        Route::get('/action-section', 'User\ActionController@index')->name('user.home_page.action_section');
        Route::post('/update-action-section', 'User\ActionController@update')->name('user.home_page.update_action_section');
        // home page brand-section route start
        Route::get('/home_page/brand_section', 'User\BrandSectionController@brandSection')->name('user.home_page.brand_section');
        Route::post('/home_page/brand_section/store_brand', 'User\BrandSectionController@storeBrand')->name('user.home_page.brand_section.store_brand');
        Route::post('/home_page/brand_section/update_brand', 'User\BrandSectionController@updateBrand')->name('user.home_page.brand_section.update_brand');
        Route::post('/home_page/brand_section/delete_brand', 'User\BrandSectionController@deleteBrand')->name('user.home_page.brand_section.delete_brand');
        Route::get('/home_page/update_intro_section', 'User\AchievementController@updateHomePageSection')->name('user.home_page.update_intro_section');
        // home page hero-section static-version route
        Route::get('/home-page/hero/static-version', 'User\HeroStaticController@staticVersion')->name('user.home_page.hero.static_version');
        Route::post('/home-page/hero/static-version/update_static_info/{language}', 'User\HeroStaticController@updateStaticInfo')->name('user.home_page.hero.update_static_info');
        // home page hero-section slider-version route start
        Route::get('/home-page/hero/slider-version', 'User\HeroSliderController@sliderVersion')->name('user.home_page.hero.slider_version');
        Route::get('/home_page/hero/slider_version/create_slider', 'User\HeroSliderController@createSlider')->name('user.home_page.hero.create_slider');
        Route::post('/home_page/hero/slider_version/store_slider_info', 'User\HeroSliderController@storeSliderInfo')->name('user.home_page.hero.store_slider_info');
        Route::get('/home_page/hero/slider_version/edit_slider/{id}', 'User\HeroSliderController@editSlider')->name('user.home_page.hero.edit_slider');
        Route::post('/home_page/hero/slider_version/update_slider_info/{id}', 'User\HeroSliderController@updateSliderInfo')->name('user.home_page.hero.update_slider_info');
        Route::post('/home_page/hero/slider_version/delete_slider', 'User\HeroSliderController@deleteSlider')->name('user.home_page.hero.delete_slider');
        // home page hero-section slider-version route end
        // home page section-heading route start
        Route::get('/home-page/work-process-section', 'User\BasicController@workProcessSection')->name('user.home_page.work_process_section');
        Route::post('/home_page/update_work_process_section/{language}', 'User\BasicController@updateWorkProcessSection')->name('user.home_page.update_work_process_section');
        // home page section-heading route end
        // home page testimonial-section->testimonials route start
        Route::get('/home_page/work_process_section/create_work_process', 'User\WorkProcessController@create')->name('user.home_page.work_process_section.create_work_process');
        Route::post('/home_page/work_process_section/store_work_process', 'User\WorkProcessController@store')->name('user.home_page.work_process_section.store_work_process');
        Route::get('/home_page/work_process_section/edit_work_process/{id}', 'User\WorkProcessController@edit')->name('user.home_page.work_process_section.edit_work_process');
        Route::post('/home_page/work_process_section/update_work_process/{id}', 'User\WorkProcessController@update')->name('user.home_page.work_process_section.update_work_process');
        Route::post('/home_page/work_process_section/delete_work_process', 'User\WorkProcessController@delete')->name('user.home_page.work_process_section.delete_work_process');
        // home page why choose us on route start
        Route::get('/home_page/why-choose-us', 'User\BasicController@whyChooseUsSection')->name('user.home_page.why_choose_us_section');
        Route::post('/home_page/why-choose-us/item-add', 'User\BasicController@whyChooseUsItemStore')->name('user.home_page.why_choose_us_item_add');
        Route::post('/home_page/why-choose-us/item-update', 'User\BasicController@whyChooseUsItemUpdate')->name('user.home_page.why_choose_us_item_update');
        Route::post('/home_page/why-choose-us/item-delete', 'User\BasicController@whyChooseUsItemDelete')->name('user.home_page.why_choose_us_item_delete');
        Route::post('/home_page/update_why-choose-us/{language}', 'User\BasicController@updateWhyChooseUsSection')->name('user.home_page.update_why_choose_us_section');

        // Admin Section Customization Routes
        Route::get('/sections', 'User\BasicController@sections')->name('user.sections.index');
        Route::post('/sections/update', 'User\BasicController@updateSection')->name('user.sections.update');

        // user Social routes
        Route::get('/social', 'User\SocialController@index')->name('user.social.index');
        Route::post('/social/store', 'User\SocialController@store')->name('user.social.store');
        Route::get('/social/{id}/edit', 'User\SocialController@edit')->name('user.social.edit');
        Route::post('/social/update', 'User\SocialController@update')->name('user.social.update');
        Route::post('/social/delete', 'User\SocialController@delete')->name('user.social.delete');

        Route::group(['middleware' => 'checkUserPermission:Team'], function () {
            // team section-heading route start
            Route::get('team_section', 'User\BasicController@teamSection')->name('user.team_section');
            Route::post('update_team_section/{language}', 'User\BasicController@updateTeamSection')->name('user.update_team_section');
            // team section-heading route end
            // teams route start
            Route::get('team_section/create_member', 'User\MemberController@createMember')->name('user.team_section.create_member');
            Route::post('team_section/store_member', 'User\MemberController@storeMember')->name('user.team_section.store_member');
            Route::get('team_section/edit_member/{id}', 'User\MemberController@editMember')->name('user.team_section.edit_member');
            Route::post('team_section/update_member/{id}', 'User\MemberController@updateMember')->name('user.team_section.update_member');
            Route::post('team_section/delete_member', 'User\MemberController@deleteMember')->name('user.team_section.delete_member');
            Route::post('team_section/member/featured', 'User\MemberController@featured')->name('user.team_section.member.feature');
        });

        //FAQ route start

        Route::get('/faq_management', 'User\FAQController@index')->name('user.faq_management');
        Route::post('/faq_management/store_faq', 'User\FAQController@store')->name('user.faq_management.store_faq');
        Route::post('/faq_management/update_faq', 'User\FAQController@update')->name('user.faq_management.update_faq');
        Route::post('/faq_management/delete_faq', 'User\FAQController@delete')->name('user.faq_management.delete_faq');
        Route::post('/faq_management/bulk_delete_faq', 'User\FAQController@bulkDelete')->name('user.faq_management.bulk_delete_faq');

        Route::group(['middleware' => 'checkUserPermission:Blog'], function () {
            //user blog categories
            Route::get('/blog-categories', 'User\BlogCategoryController@index')->name('user.blog.category.index');
            Route::post('/blog-category/store', 'User\BlogCategoryController@store')->name('user.blog.category.store');
            Route::post('/blog-category/update-featured/{id}', 'User\BlogCategoryController@updateFeatured')->name('user.blog.category.update_featured');
            Route::post('/blog-category/update', 'User\BlogCategoryController@update')->name('user.blog.category.update');
            Route::post('/blog-category/delete', 'User\BlogCategoryController@delete')->name('user.blog.category.delete');
            Route::post('/blog-category/bulk-delete', 'User\BlogCategoryController@bulkDelete')->name('user.blog.category.bulk.delete');

            //user blogs
            Route::get('/blogs', 'User\BlogController@index')->name('user.blog.index');
            Route::post('/blog/upload', 'User\BlogController@upload')->name('user.blog.upload');
            Route::post('/blog/store', 'User\BlogController@store')->name('user.blog.store');
            Route::post('/blog/update-slider', 'User\BlogController@updateSliderPost')->name('user.blog.update_slider');
            Route::post('/blog/update-featured', 'User\BlogController@updateFeaturedPost')->name('user.blog.update_featured');

            Route::get('/blog/{id}/edit', 'User\BlogController@edit')->name('user.blog.edit');
            Route::post('/blog/update', 'User\BlogController@update')->name('user.blog.update');
            Route::post('/blog/{id}/uploadUpdate', 'User\BlogController@uploadUpdate')->name('user.blog.uploadUpdate');
            Route::post('/blog/delete', 'User\BlogController@delete')->name('user.blog.delete');
            Route::post('/blog/bulk-delete', 'User\BlogController@bulkDelete')->name('user.blog.bulk.delete');
            Route::get('/blog/{langid}/getcats', 'User\BlogController@getcats')->name('user.blog.getcats');
        });

        // gallery route start
        Route::get('/gallery-management/settings', 'User\GalleryItemController@gallerySettings')->name('user.gallery_management.settings');
        Route::post('/gallery-management/update-settings', 'User\GalleryItemController@updateGallerySettings')->name('user.gallery_management.update_settings');

        Route::get('/gallery-management/categories', 'User\GalleryCategoryController@index')->name('user.gallery_management.categories');
        Route::post('/gallery-management/store-category', 'User\GalleryCategoryController@store')->name('user.gallery_management.store_category');
        Route::post('/gallery-management/update-category', 'User\GalleryCategoryController@update')->name('user.gallery_management.update_category');
        Route::post('/gallery-management/delete-category/{id}', 'User\GalleryCategoryController@destroy')->name('user.gallery_management.delete_category');
        Route::post('/gallery-management/bulk-delete-category', 'User\GalleryCategoryController@bulkDestroy')->name('user.gallery_management.bulk_delete_category');


        Route::get('/gallery-management/get-categories/{id}', 'User\GalleryCategoryController@getCategories');
        Route::get('/gallery-management/gallery', 'User\GalleryItemController@index')->name('user.gallery_management.gallery');
        Route::post('/gallery-management/store-item', 'User\GalleryItemController@store')->name('user.gallery_management.store_item');
        Route::post('/gallery-management/update-featured-item/{id}', 'User\GalleryItemController@updateFeatured')->name('user.gallery_management.update_featured_item');
        Route::get('/gallery-management/edit-item/get-categories/{code}', 'User\GalleryItemController@getCategories');
        Route::post('/gallery-management/update-item', 'User\GalleryItemController@update')->name('user.gallery_management.update_item');
        Route::post('/gallery-management/delete-item/{id}', 'User\GalleryItemController@destroy')->name('user.gallery_management.delete_item');
        Route::post('/gallery-management/bulk-delete-item', 'User\GalleryItemController@bulkDestroy')->name('user.gallery_management.bulk_delete_item');


        // Summernote image upload
        Route::post('/summernote/upload', 'Admin\SummernoteController@upload')->name('user.summernote.upload');
        //user skills
        Route::group(['middleware' => 'checkUserPermission:Skill'], function () {
            Route::get('/skills', 'User\SkillController@index')->name('user.skill.index');
            Route::post('/skill/upload', 'User\SkillController@upload')->name('user.skill.upload');
            Route::post('/skill/store', 'User\SkillController@store')->name('user.skill.store');
            Route::get('/skill/{id}/edit', 'User\SkillController@edit')->name('user.skill.edit');
            Route::post('/skill/update', 'User\SkillController@update')->name('user.skill.update');
            Route::post('/skill/{id}/uploadUpdate', 'User\SkillController@uploadUpdate')->name('user.skill.uploadUpdate');
            Route::post('/skill/delete', 'User\SkillController@delete')->name('user.skill.delete');
            Route::post('/skill/bulk-delete', 'User\SkillController@bulkDelete')->name('user.skill.bulk.delete');
        });
        //user counter information
        Route::group(['middleware' => 'checkUserPermission:Counter Information'], function () {
            Route::get('/counter-informations', 'User\CounterInformationController@index')->name('user.counter-information.index');
            Route::post('/counter-information/store', 'User\CounterInformationController@store')->name('user.counter-information.store');
            Route::get('/counter-information/{id}/edit', 'User\CounterInformationController@edit')->name('user.counter-information.edit');
            Route::post('/counter-information/update', 'User\CounterInformationController@update')->name('user.counter-information.update');
            Route::post('/counter-information/delete', 'User\CounterInformationController@delete')->name('user.counter-information.delete');
            Route::post('/counter-information/bulk-delete', 'User\CounterInformationController@bulkDelete')->name('user.counter-information.bulk.delete');
        });

        Route::group(['middleware' => 'checkUserPermission:Portfolio'], function () {
            //user portfolio categories
            Route::get('/portfolio-categories', 'User\PortfolioCategoryController@index')->name('user.portfolio.category.index');
            Route::post('/portfolio-category/store', 'User\PortfolioCategoryController@store')->name('user.portfolio.category.store');
            Route::post('/portfolio-category/update', 'User\PortfolioCategoryController@update')->name('user.portfolio.category.update');
            Route::post('/portfolio-category/delete', 'User\PortfolioCategoryController@delete')->name('user.portfolio.category.delete');
            Route::post('/portfolio-category/bulk-delete', 'User\PortfolioCategoryController@bulkDelete')->name('user.portfolio.category.bulk.delete');
            Route::post('/portfolio-category/featured', 'User\PortfolioCategoryController@makeFeatured')->name('user.portfolio.category.makeFeatured');
            //user portfolios
            Route::get('/portfolios', 'User\PortfolioController@index')->name('user.portfolio.index');
            Route::post('/portfolio/store', 'User\PortfolioController@store')->name('user.portfolio.store');
            Route::post('/portfolio/sliderstore', 'User\PortfolioController@sliderstore')->name('user.portfolio.sliderstore');
            Route::post('/portfolio/sliderupdate', 'User\PortfolioController@sliderupdate')->name('user.portfolio.sliderupdate');
            Route::post('/portfolio/sliderrmv', 'User\PortfolioController@sliderrmv')->name('user.portfolio.sliderrmv');
            Route::get('/portfolio/{id}/edit', 'User\PortfolioController@edit')->name('user.portfolio.edit');
            Route::get('/portfolio/{id}/images', 'User\PortfolioController@images')->name('user.portfolio.images');
            Route::post('/portfolio/sliderupdate', 'User\PortfolioController@sliderupdate')->name('user.portfolio.sliderupdate');
            Route::post('/portfolio/update', 'User\PortfolioController@update')->name('user.portfolio.update');
            Route::post('/portfolio/delete', 'User\PortfolioController@delete')->name('user.portfolio.delete');
            Route::post('/portfolio/bulk-delete', 'User\PortfolioController@bulkDelete')->name('user.portfolio.bulk.delete');
            Route::post('/portfolio/featured', 'User\PortfolioController@featured')->name('user.portfolio.featured');
            Route::get('/portfolio/{langid}/getcats', 'User\PortfolioController@getcats')->name('user.portfolio.getcats');
        });

        Route::group(['middleware' => 'checkUserPermission:Service'], function () {
            //User services
            Route::get('/services', 'User\ServiceController@index')->name('user.services.index');
            Route::post('/service/store', 'User\ServiceController@store')->name('user.service.store');
            Route::get('/service/{id}/edit', 'User\ServiceController@edit')->name('user.service.edit');
            Route::post('/service/update', 'User\ServiceController@update')->name('user.service.update');
            Route::post('/service/delete', 'User\ServiceController@delete')->name('user.service.delete');
            Route::post('/service/bulk-delete', 'User\ServiceController@bulkDelete')->name('user.service.bulk.delete');
            Route::post('service/featured', 'User\ServiceController@featured')->name('user.service.feature');
        });
        //User testimonial
        Route::group(['middleware' => 'checkUserPermission:Testimonial'], function () {
            Route::get('/testimonials', 'User\TestimonialController@index')->name('user.testimonials.index');
            Route::post('/testimonial/store', 'User\TestimonialController@store')->name('user.testimonial.store');
            Route::get('/testimonial/{id}/edit', 'User\TestimonialController@edit')->name('user.testimonial.edit');
            Route::post('/testimonial/update', 'User\TestimonialController@update')->name('user.testimonial.update');
            Route::post('/testimonial/delete', 'User\TestimonialController@delete')->name('user.testimonial.delete');
            Route::post('/testimonial/bulk-delete', 'User\TestimonialController@bulkDelete')->name('user.testimonial.bulk.delete');
        });
        // Start rooms management route start
        Route::group(['middleware' => 'checkUserPermission:Hotel Booking'], function () {
            Route::get('/rooms_management/settings', [RoomManagementController::class, 'settings'])->name('user.rooms_management.settings');

            Route::post('/rooms_management/update_settings', [RoomManagementController::class, 'updateSettings'])->name('user.rooms_management.update_settings');

            Route::get('/rooms_management/coupons', [RoomManagementController::class, 'coupons'])->name('user.rooms_management.coupons');

            Route::post('/rooms_management/store-coupon', [RoomManagementController::class, 'storeCoupon'])->name('user.rooms_management.store_coupon');

            Route::post('/rooms_management/update-coupon', [RoomManagementController::class, 'updateCoupon'])->name('user.rooms_management.update_coupon');

            Route::post('/rooms_management/delete-coupon/{id}', [RoomManagementController::class, 'destroyCoupon'])->name('user.rooms_management.delete_coupon');

            Route::get('/rooms_management/amenities', [RoomManagementController::class, 'amenities'])->name('user.rooms_management.amenities');

            Route::post('/rooms_management/store_amenity/{language}', [RoomManagementController::class, 'storeAmenity'])->name('user.rooms_management.store_amenity');

            Route::post('/rooms_management/update_amenity', [RoomManagementController::class, 'updateAmenity'])->name('user.rooms_management.update_amenity');

            Route::post('/rooms_management/delete_amenity', [RoomManagementController::class, 'deleteAmenity'])->name('user.rooms_management.delete_amenity');

            Route::post('/rooms_management/bulk_delete_amenity', [RoomManagementController::class, 'bulkDeleteAmenity'])->name('user.rooms_management.bulk_delete_amenity');

            Route::get('/rooms_management/categories', [RoomManagementController::class, 'categories'])->name('user.rooms_management.categories');

            Route::post('/rooms_management/store_category/{language}', [RoomManagementController::class, 'storeCategory'])->name('user.rooms_management.store_category');

            Route::post('/rooms_management/update_category', [RoomManagementController::class, 'updateCategory'])->name('user.rooms_management.update_category');

            Route::post('/rooms_management/delete_category', [RoomManagementController::class, 'deleteCategory'])->name('user.rooms_management.delete_category');

            Route::post('/rooms_management/bulk_delete_category', [RoomManagementController::class, 'bulkDeleteCategory'])->name('user.rooms_management.bulk_delete_category');

            Route::get('/rooms_management/rooms', [RoomManagementController::class, 'rooms'])->name('user.rooms_management.rooms');

            Route::post('/rooms_management/upload-slider-image', [RoomManagementController::class, 'uploadSliderImage'])->name('user.rooms_management.upload_slider_image');

            Route::post('/rooms_management/remove-slider-image', [RoomManagementController::class, 'removeSliderImage'])->name('user.rooms_management.remove_slider_image');

            Route::post('/rooms_management/detach-slider-image', [RoomManagementController::class, 'detachImage'])->name('user.rooms_management.detach_slider_image');

            Route::get('/rooms_management/create_room', [RoomManagementController::class, 'createRoom'])->name('user.rooms_management.create_room');

            Route::post('/rooms_management/store_room', [RoomManagementController::class, 'storeRoom'])->name('user.rooms_management.store_room');

            Route::post('/rooms_management/update_featured_room', [RoomManagementController::class, 'updateFeaturedRoom'])->name('user.rooms_management.update_featured_room');

            Route::get('/rooms_management/edit_room/{id}', [RoomManagementController::class, 'editRoom'])->name('user.rooms_management.edit_room');

            Route::get('/rooms_management/slider_images/{id}', [RoomManagementController::class, 'getSliderImages']);

            Route::post('/rooms_management/update_room/{id}', [RoomManagementController::class, 'updateRoom'])->name('user.rooms_management.update_room');

            Route::post('/rooms_management/delete_room', [RoomManagementController::class, 'deleteRoom'])->name('user.rooms_management.delete_room');

            Route::post('/rooms_management/bulk_delete_room', [RoomManagementController::class, 'bulkDeleteRoom'])->name('user.rooms_management.bulk_delete_room');
        });
        // End rooms management route end
        // Start Room Bookings Routes
        Route::group(['middleware' => 'checkUserPermission:Hotel Booking'], function () {
            Route::get('/room_bookings/all_bookings', [RoomManagementController::class, 'bookings'])->name('user.room_bookings.all_bookings');

            Route::get('/room_bookings/paid_bookings', [RoomManagementController::class, 'bookings'])->name('user.room_bookings.paid_bookings');

            Route::get('/room_bookings/unpaid_bookings', [RoomManagementController::class, 'bookings'])->name('user.room_bookings.unpaid_bookings');

            Route::post('/room_bookings/update_payment_status', [RoomManagementController::class, 'updatePaymentStatus'])->name('user.room_bookings.update_payment_status');

            Route::get('/room_bookings/booking_details_and_edit/{id}', [RoomManagementController::class, 'editBookingDetails'])->name('user.room_bookings.booking_details_and_edit');

            Route::post('/room_bookings/update_booking', [RoomManagementController::class, 'updateBooking'])->name('user.room_bookings.update_booking');

            Route::post('/room_bookings/send_mail', [RoomManagementController::class, 'sendMail'])->name('user.room_bookings.send_mail');

            Route::post('/room_bookings/delete_booking/{id}', [RoomManagementController::class, 'deleteBooking'])->name('user.room_bookings.delete_booking');

            Route::post('/room_bookings/bulk_delete_booking', [RoomManagementController::class, 'bulkDeleteBooking'])->name('user.room_bookings.bulk_delete_booking');

            Route::get('/room_bookings/get_booked_dates', [RoomManagementController::class, 'bookedDates'])->name('user.room_bookings.get_booked_dates');

            Route::get('/room_bookings/booking_form', [RoomManagementController::class, 'bookingForm'])->name('user.room_bookings.booking_form');

            Route::post('/room_bookings/make_booking', [RoomManagementController::class, 'makeBooking'])->name('user.room_bookings.make_booking');
        });
        // End Room Bookings Rotue

        // course management route start
        Route::middleware('checkUserPermission:Course Management')->prefix('/course-management')->group(function () {

            // instructor route start
            Route::get('/instructors', 'User\CourseManagement\Instructor\InstructorController@index')->name('user.instructors');

            Route::get('/create-instructor', 'User\CourseManagement\Instructor\InstructorController@create')->name('user.create_instructor');

            Route::post('/store-instructor', 'User\CourseManagement\Instructor\InstructorController@store')->name('user.store_instructor');

            Route::post('/instructor/{id}/update-featured', 'User\CourseManagement\Instructor\InstructorController@updateFeatured')->name('user.instructor.update_featured');

            Route::get('/edit-instructor/{id}', 'User\CourseManagement\Instructor\InstructorController@edit')->name('user.edit_instructor');

            Route::post('/update-instructor/{id}', 'User\CourseManagement\Instructor\InstructorController@update')->name('user.update_instructor');

            Route::prefix('/instructor')->group(function () {

                Route::get('/{id}/social-links', 'User\CourseManagement\Instructor\SocialLinkController@links')->name('user.instructor.social_links');

                Route::post('/{id}/store-social-link', 'User\CourseManagement\Instructor\SocialLinkController@storeLink')->name('user.instructor.store_social_link');

                Route::get('/{instructor_id}/edit-social-link/{id}', 'User\CourseManagement\Instructor\SocialLinkController@editLink')->name('user.instructor.edit_social_link');

                Route::post('/update-social-link/{id}', 'User\CourseManagement\Instructor\SocialLinkController@updateLink')->name('user.instructor.update_social_link');

                Route::post('/delete-social-link/{id}', 'User\CourseManagement\Instructor\SocialLinkController@destroyLink')->name('user.instructor.delete_social_link');
            });

            Route::post('/delete-instructor/{id}', 'User\CourseManagement\Instructor\InstructorController@destroy')->name('user.delete_instructor');

            Route::post('/bulk-delete-instructor', 'User\CourseManagement\Instructor\InstructorController@bulkDestroy')->name('user.bulk_delete_instructor');

            // instructor route end

            Route::get('/categories', 'User\CourseManagement\CategoryController@index')->name('user.course_management.categories');

            Route::post('/store-category', 'User\CourseManagement\CategoryController@store')->name('user.course_management.store_category');

            Route::post('/category/{id}/update-featured', 'User\CourseManagement\CategoryController@updateFeatured')->name('user.course_management.category.update_featured');

            Route::put('/update-category', 'User\CourseManagement\CategoryController@update')->name('user.course_management.update_category');

            Route::post('/delete-category/{id}', 'User\CourseManagement\CategoryController@destroy')->name('user.course_management.delete_category');

            Route::post('/bulk-delete-category', 'User\CourseManagement\CategoryController@bulkDestroy')->name('user.course_management.bulk_delete_category');

            Route::get('/courses', 'User\CourseManagement\CourseController@index')->name('user.course_management.courses');

            Route::get('/create-course', 'User\CourseManagement\CourseController@create')->name('user.course_management.create_course');

            Route::post('/store-course', 'User\CourseManagement\CourseController@store')->name('user.course_management.store_course');

            Route::post('/course/{id}/update-status', 'User\CourseManagement\CourseController@updateStatus')->name('user.course_management.course.update_status');

            Route::post('/course/{id}/update-featured', 'User\CourseManagement\CourseController@updateFeatured')->name('user.course_management.course.update_featured');

            Route::get('/edit-course/{id}', 'User\CourseManagement\CourseController@edit')->name('user.course_management.edit_course');

            Route::post('/update-course/{id}', 'User\CourseManagement\CourseController@update')->name('user.course_management.update_course');

            Route::prefix('/course')->group(function () {

                Route::get('/{id}/modules', 'User\CourseManagement\ModuleController@index')->name('user.course_management.course.modules');

                Route::post('/{id}/store-module', 'User\CourseManagement\ModuleController@store')->name('user.course_management.course.store_module');

                Route::post('/update-module', 'User\CourseManagement\ModuleController@update')->name('user.course_management.course.update_module');

                Route::post('/delete-module/{id}', 'User\CourseManagement\ModuleController@destroy')->name('user.course_management.course.delete_module');

                Route::post('/bulk-delete-module', 'User\CourseManagement\ModuleController@bulkDestroy')->name('user.course_management.course.bulk_delete_module');
            });

            Route::prefix('/module')->group(function () {
                Route::post('/{id}/store-lesson', 'User\CourseManagement\LessonController@store')->name('user.course_management.module.store_lesson');
                Route::post('/update-lesson', 'User\CourseManagement\LessonController@update')->name('user.course_management.module.update_lesson');
            });

            Route::prefix('/lesson')->group(function () {

                Route::get('/{id}/contents', 'User\CourseManagement\LessonContentController@contents')->name('user.course_management.lesson.contents');

                Route::post('/upload-video', 'User\CourseManagement\LessonContentController@uploadVideo')->name('user.course_management.lesson.upload_video');

                Route::post('/video-preview', 'User\CourseManagement\LessonContentController@videoPreview')->name('user.course_management.lesson.video_preview');

                Route::post('/remove-video', 'User\CourseManagement\LessonContentController@removeVideo')->name('user.course_management.lesson.remove_video');

                Route::post('/{id}/store-video', 'User\CourseManagement\LessonContentController@storeVideo')->name('user.course_management.lesson.store_video');

                Route::post('/upload-file', 'User\CourseManagement\LessonContentController@uploadFile')->name('user.course_management.lesson.upload_file');

                Route::post('/remove-file', 'User\CourseManagement\LessonContentController@removeFile')->name('user.course_management.lesson.remove_file');

                Route::post('/{id}/store-file', 'User\CourseManagement\LessonContentController@storeFile')->name('user.course_management.lesson.store_file');

                Route::get('/download-file/{id}', 'User\CourseManagement\LessonContentController@downloadFile')->name('user.course_management.lesson.download_file');

                Route::post('/{id}/store-text', 'User\CourseManagement\LessonContentController@storeText')->name('user.course_management.lesson.store_text');

                Route::post('/update-text', 'User\CourseManagement\LessonContentController@updateText')->name('user.course_management.lesson.update_text');

                Route::post('/{id}/store-code', 'User\CourseManagement\LessonContentController@storeCode')->name('user.course_management.lesson.store_code');

                Route::post('/update-code', 'User\CourseManagement\LessonContentController@updateCode')->name('user.course_management.lesson.update_code');

                Route::post('/delete-content/{id}', 'User\CourseManagement\LessonContentController@destroyContent')->name('user.course_management.lesson.delete_content');

                Route::get('/{id}/create-quiz', 'User\CourseManagement\LessonQuizController@create')->name('user.course_management.lesson.create_quiz');

                Route::post('/{id}/store-quiz', 'User\CourseManagement\LessonQuizController@store')->name('user.course_management.lesson.store_quiz');

                Route::get('/{id}/manage-quiz', 'User\CourseManagement\LessonQuizController@index')->name('user.course_management.lesson.manage_quiz');

                Route::get('/{lessonId}/edit-quiz/{quizId}', 'User\CourseManagement\LessonQuizController@edit')->name('user.course_management.lesson.edit_quiz');

                Route::get('/get-ans/{id}', 'User\CourseManagement\LessonQuizController@getAns')->name('user.course_management.lesson.get_ans');

                Route::post('/update-quiz/{id}', 'User\CourseManagement\LessonQuizController@update')->name('user.course_management.lesson.update_quiz');

                Route::post('/delete-quiz/{id}', 'User\CourseManagement\LessonQuizController@destroy')->name('user.course_management.lesson.delete_quiz');

                Route::post('/sort-contents', 'User\CourseManagement\LessonContentController@sort')->name('user.course_management.lesson.sort_contents');
            });

            Route::post('/module/delete-lesson/{id}', 'User\CourseManagement\LessonController@destroy')->name('user.course_management.module.delete_lesson');

            Route::prefix('/course')->group(function () {
                Route::get('/{id}/faqs', 'User\CourseManagement\CourseFaqController@index')->name('user.course_management.course.faqs');
                Route::post('/{id}/store-faq', 'User\CourseManagement\CourseFaqController@store')->name('user.course_management.course.store_faq');
                Route::post('/update-faq', 'User\CourseManagement\CourseFaqController@update')->name('user.course_management.course.update_faq');
                Route::post('/delete-faq/{id}', 'User\CourseManagement\CourseFaqController@destroy')->name('user.course_management.course.delete_faq');
                Route::post('/bulk-delete-faq', 'User\CourseManagement\CourseFaqController@bulkDestroy')->name('user.course_management.course.bulk_delete_faq');
                Route::get('/{id}/thanks-page', 'User\CourseManagement\CourseController@thanksPage')->name('user.course_management.course.thanks_page');
                Route::post('/{id}/update-thanks-page', 'User\CourseManagement\CourseController@updateThanksPage')->name('user.course_management.course.update_thanks_page');
                // Route::group(['middleware' => 'checkUserPermission:Course Completion Certificate'], function () {
                Route::get('/{id}/certificate-settings', 'User\CourseManagement\CourseController@certificateSettings')->name('user.course_management.course.certificate_settings');
                Route::post('/{id}/update-certificate-settings', 'User\CourseManagement\CourseController@updateCertificateSettings')->name('user.course_management.course.update_certificate_settings');
                // });
            });

            Route::post('/delete-course/{id}', 'User\CourseManagement\CourseController@destroy')->name('user.course_management.delete_course');
            Route::post('/bulk-delete-course', 'User\CourseManagement\CourseController@bulkDestroy')->name('user.course_management.bulk_delete_course');

            Route::get('/coupons', 'User\CourseManagement\CouponController@index')->name('user.course_management.coupons');
            Route::post('/store-coupon', 'User\CourseManagement\CouponController@store')->name('user.course_management.store_coupon');
            Route::post('/update-coupon', 'User\CourseManagement\CouponController@update')->name('user.course_management.update_coupon');
            Route::post('/delete-coupon/{id}', 'User\CourseManagement\CouponController@destroy')->name('user.course_management.delete_coupon');

            // course enrolment route start
            Route::get('/course-enrolments', 'User\CourseManagement\EnrolmentController@index')->name('user.course_enrolments');
            Route::prefix('/course-enrolment')->group(function () {
                Route::post('/{id}/update-payment-status', 'User\CourseManagement\EnrolmentController@updatePaymentStatus')->name('user.course_enrolment.update_payment_status');
                Route::get('/{id}/details', 'User\CourseManagement\EnrolmentController@show')->name('user.course_enrolment.details');
                Route::post('/{id}/delete', 'User\CourseManagement\EnrolmentController@destroy')->name('user.course_enrolment.delete');
            });

            Route::get('/course-enrolments/report', 'User\CourseManagement\EnrolmentController@report')->name('user.course_enrolments.report');
            Route::get('/course-enrolments/export', 'User\CourseManagement\EnrolmentController@export')->name('user.course_enrolments.export');
            Route::post('/course-enrolments/bulk-delete', 'User\CourseManagement\EnrolmentController@bulkDestroy')->name('user.course_enrolments.bulk_delete');
            // course enrolment route end

        });
        // course management route end

        //user job experience

        Route::get('/job-experiences', 'User\JobExperienceController@index')->name('user.job.experiences.index');
        Route::post('/job-experience/store', 'User\JobExperienceController@store')->name('user.job.experience.store');
        Route::get('/job-experience/{id}/edit', 'User\JobExperienceController@edit')->name('user.job.experience.edit');
        Route::post('/job-experience/update', 'User\JobExperienceController@update')->name('user.job.experience.update');
        Route::post('/job-experience/delete', 'User\JobExperienceController@delete')->name('user.job.experience.delete');
        Route::post('/job-experience/bulk-delete', 'User\JobExperienceController@bulkDelete')->name('user.job.experience.bulk.delete');

        //user educational experiences

        Route::get('/experiences', 'User\EducationController@index')->name('user.experience.index');
        Route::post('/experience/upload', 'User\EducationController@upload')->name('user.experience.upload');
        Route::post('/experience/store', 'User\EducationController@store')->name('user.experience.store');
        Route::get('/experience/{id}/edit', 'User\EducationController@edit')->name('user.experience.edit');
        Route::post('/experience/update', 'User\EducationController@update')->name('user.experience.update');
        Route::post('/experience/{id}/uploadUpdate', 'User\EducationController@uploadUpdate')->name('user.experience.uploadUpdate');
        Route::post('/experience/delete', 'User\EducationController@delete')->name('user.experience.delete');
        Route::post('/experience/bulk-delete', 'User\EducationController@bulkDelete')->name('user.experience.bulk.delete');

        // start Donation Manage Routes
        Route::group(['middleware' => 'checkUserPermission:Donation Management'], function () {
            Route::get('/donations', 'User\DonationManagement\DonationController@index')->name('user.donation.index');
            Route::get('/donation/catgories', 'User\DonationManagement\DonationCategoryController@index')->name('user.donation.categories');
            Route::post('/donation/catgories/store/{language}', 'User\DonationManagement\DonationCategoryController@store')->name('user.donation.category.store');
            Route::post('/donation/catgories/update', 'User\DonationManagement\DonationCategoryController@update')->name('user.donation.category.update');
            Route::post(
                '/donation/catgories/delete',
                'User\DonationManagement\DonationCategoryController@destroy'
            )->name('user.donation.category.destroy');
            Route::post('/donation/catgories/bulk-delete', 'User\DonationManagement\DonationCategoryController@bulkDestroy')->name('user.donation.category.bulkDestroy');

            Route::get('/donation/create', 'User\DonationManagement\DonationController@create')->name('user.donation.create');
            Route::get('/donation/settings', 'User\DonationManagement\DonationController@settings')->name('user.donation.settings');
            Route::post('/donation/settings', 'User\DonationManagement\DonationController@updateSettings')->name('user.donation.settings');
            Route::post('/donation/store', 'User\DonationManagement\DonationController@store')->name('user.donation.store');
            Route::get('/donation/{id}/edit', 'User\DonationManagement\DonationController@edit')->name('user.donation.edit');
            Route::post('/donation/{id}/update', 'User\DonationManagement\DonationController@update')->name('user.donation.update');
            Route::post('/donation/{id}/uploadUpdate', 'User\DonationManagement\DonationController@uploadUpdate')->name('user.donation.uploadUpdate');
            Route::post('/donation/delete', 'User\DonationManagement\DonationController@delete')->name('user.donation.delete');
            Route::post('/donation/bulk-delete', 'User\DonationManagement\DonationController@bulkDelete')->name('user.donation.bulk.delete');
            Route::get('/donations/payment-log', 'User\DonationManagement\DonationController@paymentLog')->name('user.donation.payment.log');
            Route::post('/donations/payment/delete', 'User\DonationManagement\DonationController@paymentDelete')->name('user.donation.payment.delete');
            Route::post('/donations/bulk/delete', 'User\DonationManagement\DonationController@bulkPaymentDelete')->name('user.donation.payment.bulk.delete');
            Route::post('/donations/payment-log-update', 'User\DonationManagement\DonationController@paymentLogUpdate')->name('user.donation.payment.log.update');
            Route::get('/donation/report', 'User\DonationManagement\DonationController@report')->name('user.donation.report');
            Route::get('/donation/export', 'User\DonationManagement\DonationController@exportReport')->name('user.donation.export');
        });
        // end donation management routes
        Route::group(['middleware' => 'checkUserPermission:Ecommerce|Donation Management|Course Management|Hotel Booking'], function () {
            // user start register-user, ban user, details, reports
            Route::post('user/customer/ban', 'User\UserController@userban')->name('user.customer.ban');
            Route::get('register/customer/details/{id}', 'User\UserController@view')->name('register.customer.view');
            Route::post('register/customer/email', 'User\UserController@emailStatus')->name('register.customer.email');
            Route::get('/ads-reports', 'User\PostController@viewReports')->name('user.ads-report');
            Route::get('/register-user', 'User\UserController@registerUsers')->name('user.register-user');
            Route::get('/secrect-login', 'User\UserController@secretLogin')->name('customer.secrect.login');
            Route::get('register/customer/{id}/changePassword', 'User\UserController@changePassCstmr')->name('register.customer.changePass');
            Route::post('register/customer/updatePassword', 'User\UserController@updatePasswordCstmr')->name('register.customer.updatePassword');
            Route::post('register/customer/delete', 'User\UserController@delete')->name('register.customer.delete');
            Route::post('register/customer/bulk-delete', 'User\UserController@bulkDelete')->name('register.customer.bulk.delete');
            Route::post('/digital/download', 'User\OrderController@digitalDownload')->name('user-digital-download');
            // user End register-user, ban user, details, reports
        });
        //START SHOP MANAGEMENT
        Route::group(['middleware' => 'checkUserPermission:Ecommerce'], function () {
            // Category
            Route::get('/category', 'User\ItemCategoryController@index')->name('user.itemcategory.index');
            Route::post('/category/store', 'User\ItemCategoryController@store')->name('user.itemcategory.store');
            Route::get('/category/{id}/edit', 'User\ItemCategoryController@edit')->name('user.itemcategory.edit');
            Route::post('/category/update', 'User\ItemCategoryController@update')->name('user.itemcategory.update');
            Route::post('/category/feature', 'User\ItemCategoryController@feature')->name('user.itemcategory.feature');
            Route::post('/category/footer', 'User\ItemCategoryController@footer')->name('user.itemcategory.footer');
            Route::post('/category/delete', 'User\ItemCategoryController@delete')->name('user.itemcategory.delete');
            Route::post('/category/bulk-delete', 'User\ItemCategoryController@bulkDelete')->name('user.itemcategory.bulk.delete');

            //    SUbcategory
            Route::get('/subcategory', 'User\ItemSubCategoryController@index')->name('user.itemsubcategory.index');
            Route::post('/subcategory/store', 'User\ItemSubCategoryController@store')->name('user.itemsubcategory.store');
            Route::get('/subcategory/{id}/edit', 'User\ItemSubCategoryController@edit')->name('user.itemsubcategory.edit');
            Route::post('/subcategory/update', 'User\ItemSubCategoryController@update')->name('user.itemsubcategory.update');
            Route::post('/subcategory/feature', 'User\ItemSubCategoryController@feature')->name('user.itemsubcategory.feature');
            Route::post('/subcategory/delete', 'User\ItemSubCategoryController@delete')->name('user.itemsubcategory.delete');
            Route::post('/subcategory/bulk-delete', 'User\ItemSubCategoryController@bulkDelete')->name('user.itemsubcategory.bulk.delete');
            // language wise category subcategory insert
            Route::get('/subcategory/get-categories/{id}', 'User\ItemSubCategoryController@getCategories');

            Route::get('/shipping', 'User\ShopSettingController@index')->name('user.shipping.index');
            Route::post('/shipping/store', 'User\ShopSettingController@store')->name('user.shipping.store');
            Route::get('/shipping/{id}/edit', 'User\ShopSettingController@edit')->name('user.shipping.edit');
            Route::post('/shipping/update', 'User\ShopSettingController@update')->name('user.shipping.update');
            Route::post('/shipping/delete', 'User\ShopSettingController@delete')->name('user.shipping.delete');

            Route::get('/item', 'User\ItemController@index')->name('user.item.index');
            Route::get('/item/type', 'User\ItemController@type')->name('user.item.type');
            Route::get('/item/create', 'User\ItemController@create')->name('user.item.create');
            Route::post('/item/store', 'User\ItemController@store')->name('user.item.store');
            Route::get('/item/{id}/edit', 'User\ItemController@edit')->name('user.item.edit');
            Route::post('/item/update', 'User\ItemController@update')->name('user.item.update');
            Route::post('/item/feature', 'User\ItemController@feature')->name('user.item.feature');
            Route::post('/item/special-offer', 'User\ItemController@specialOffer')->name('user.item.specialOffer');
            Route::post('/item/delete', 'User\ItemController@delete')->name('user.item.delete');
            Route::get('/item/{useritem}/variations', 'User\ItemController@variations')->name('user.item.variations');
            Route::post('/item/variation/store', 'User\ItemController@variationStore')->name('user.item.variation.store');

            Route::post('/item/flash-remove', 'User\ItemController@flashRemove')->name('user.item.flash.remove');

            Route::post('/item/setFlashSale/{id}', 'User\ItemController@setFlashSale')->name('user.item.setFlashSale');

            Route::post('/item/slider', 'User\ItemController@slider')->name('user.item.slider');
            Route::post('/item/slider/remove', 'User\ItemController@sliderRemove')->name('user.item.slider-remove');
            Route::post('/item/db/slider/remove', 'User\ItemController@dbSliderRemove')->name('user.item.db-slider-remove');

            Route::post('/item/sub-category-getter', 'User\ItemController@subcatGetter')->name('user.item.subcatGetter');

            Route::get('item/{id}/getcategory', 'User\ItemController@getCategory')->name('user.item.getcategory');
            Route::post('/item/delete', 'User\ItemController@delete')->name('user.item.delete');
            Route::post('/item/bulk-delete', 'User\ItemController@bulkDelete')->name('user.item.bulk.delete');
            Route::post('/item/sliderupdate', 'User\ItemController@sliderupdate')->name('user.item.sliderupdate');

            Route::get('/item/{id}/variants', 'User\ItemController@variants')->name('user.item.variants');

            // Route::post('/item/update', 'User\ItemController@update')->name('user.item.update');

            Route::get('/item/settings', 'User\ItemController@settings')->name('user.item.settings');
            Route::post('/item/settings', 'User\ItemController@updateSettings')->name('user.item.settings');

            // User Coupon Routes
            Route::get('/coupon', 'User\CouponController@index')->name('user.coupon.index');
            Route::post('/coupon/store', 'User\CouponController@store')->name('user.coupon.store');
            Route::get('/coupon/{id}/edit', 'User\CouponController@edit')->name('user.coupon.edit');
            Route::post('/coupon/update', 'User\CouponController@update')->name('user.coupon.update');
            Route::post('/coupon/delete', 'User\CouponController@delete')->name('user.coupon.delete');
            // User Coupon Routes End
            Route::post('/orders/mail', 'Admin\ItemOrderController@mail')->name('user.orders.mail');

            // Product Order
            Route::get('/item/all/orders', 'User\ItemOrderController@all')->name('user.all.item.orders');
            Route::get('/item/pending/orders', 'User\ItemOrderController@pending')->name('user.pending.item.orders');
            Route::get('/item/processing/orders', 'User\ItemOrderController@processing')->name('user.processing.item.orders');
            Route::get('/item/completed/orders', 'User\ItemOrderController@completed')->name('user.completed.item.orders');
            Route::get('/item/rejected/orders', 'User\ItemOrderController@rejected')->name('user.rejected.item.orders');
            Route::post('/item/orders/status', 'User\ItemOrderController@status')->name('user.item.orders.status');
            Route::post('/item/payment/status', 'User\ItemOrderController@paymentStatus')->name('user.item.paymentStatus');
            Route::get('/item/orders/details/{id}', 'User\ItemOrderController@details')->name('user.item.details');
            Route::post('/item/order/delete', 'User\ItemOrderController@orderDelete')->name('user.item.order.delete');
            Route::post('/item/order/bulk-delete', 'User\ItemOrderController@bulkOrderDelete')->name('user.item.order.bulk.delete');
            Route::get('/item/orders/report', 'User\ItemOrderController@report')->name('user.orders.report');
            Route::get('/item/export/report', 'User\ItemOrderController@exportReport')->name('user.orders.export');
            Route::get('/item-download/{itemid}', 'User\OrderController@digitalDownload')->name('user-digital-item-download');
            // Product Order end

        });
        //END SHOP MANAGEMENT
        Route::group(['middleware' => 'checkUserPermission:Ecommerce|Hotel Booking|Course Management|Donation Management'], function () {
            // User Online Gateways Routes
            Route::get('/gateways', 'User\GatewayController@index')->name('user.gateway.index');
            Route::post('/stripe/update', 'User\GatewayController@stripeUpdate')->name('user.stripe.update');
            Route::post('/anet/update', 'User\GatewayController@anetUpdate')->name('user.anet.update');
            Route::post('/paypal/update', 'User\GatewayController@paypalUpdate')->name('user.paypal.update');
            Route::post('/paystack/update', 'User\GatewayController@paystackUpdate')->name('user.paystack.update');
            Route::post('/paytm/update', 'User\GatewayController@paytmUpdate')->name('user.paytm.update');
            Route::post('/flutterwave/update', 'User\GatewayController@flutterwaveUpdate')->name('user.flutterwave.update');
            Route::post('/instamojo/update', 'User\GatewayController@instamojoUpdate')->name('user.instamojo.update');
            Route::post('/mollie/update', 'User\GatewayController@mollieUpdate')->name('user.mollie.update');
            Route::post('/razorpay/update', 'User\GatewayController@razorpayUpdate')->name('user.razorpay.update');
            Route::post('/mercadopago/update', 'User\GatewayController@mercadopagoUpdate')->name('user.mercadopago.update');
            Route::post('/phonepe/update', 'User\GatewayController@phonepeUpdate')->name('user.phonepe.update');
            Route::post('/perfect_money/update', 'User\GatewayController@perfectMoneyUpdate')->name('user.perfect_money.update');
            Route::post('/xendit/update', 'User\GatewayController@xenditUpdate')->name('user.xendit.update');
            Route::post('/yoco/update', 'User\GatewayController@yocoUpdate')->name('user.yoco.update');
            Route::post('/midtrans/update', 'User\GatewayController@midtransUpdate')->name('user.midtrans.update');
            Route::post('/myfatoorah/update', 'User\GatewayController@myfatoorahUpdate')->name('user.myfatoorah.update');
            Route::post('/iyzico/update', 'User\GatewayController@iyzicoUpdate')->name('user.iyzico.update');
            Route::post('/toyyibpay/update', 'User\GatewayController@toyyibpayUpdate')->name('user.toyyibpay.update');
            Route::post('/paytabs/update', 'User\GatewayController@paytabsUpdate')->name('user.paytabs.update');

            // User Offline Gateway Routes
            Route::get('/offline/gateways', 'User\GatewayController@offline')->name('user.gateway.offline');
            Route::post('/offline/gateway/store', 'User\GatewayController@store')->name('user.gateway.offline.store');
            Route::post('/offline/gateway/update', 'User\GatewayController@update')->name('user.gateway.offline.update');
            Route::post('/offline/status', 'User\GatewayController@status')->name('user.offline.status');
            Route::post('/offline/gateway/delete', 'User\GatewayController@delete')->name('user.offline.gateway.delete');
        });

        Route::group(['middleware' => 'checkUserPermission:Career'], function () {
            // user Job Category Routes
            Route::get('/jcategorys', 'User\JcategoryController@index')->name('user.jcategory.index');
            Route::post('/jcategory/store', 'User\JcategoryController@store')->name('user.jcategory.store');
            Route::get('/jcategory/{id}/edit', 'User\JcategoryController@edit')->name('user.jcategory.edit');
            Route::post('/jcategory/update', 'User\JcategoryController@update')->name('user.jcategory.update');
            Route::post('/jcategory/delete', 'User\JcategoryController@delete')->name('user.jcategory.delete');
            Route::post('/jcategory/bulk-delete', 'User\JcategoryController@bulkDelete')->name('user.jcategory.bulk.delete');

            // user Jobs Routes
            Route::get('/jobs', 'User\JobController@index')->name('user.job.index');
            Route::get('/job/create', 'User\JobController@create')->name('user.job.create');
            Route::post('/job/store', 'User\JobController@store')->name('user.job.store');
            Route::get('/job/{id}/edit', 'User\JobController@edit')->name('user.job.edit');
            Route::post('/job/update', 'User\JobController@update')->name('user.job.update');
            Route::post('/job/delete', 'User\JobController@delete')->name('user.job.delete');
            Route::post('/job/bulk-delete', 'User\JobController@bulkDelete')->name('user.job.bulk.delete');
            Route::get('/job/{langid}/getcats', 'User\JobController@getcats')->name('user.job.getcats');
        });
        Route::group(['middleware' => 'checkUserPermission:Custom Page'], function () {
            // Menu Manager Routes
            Route::get('/pages', 'User\PageController@index')->name('user.page.index');
            Route::get('/page/create', 'User\PageController@create')->name('user.page.create');
            Route::post('/page/store', 'User\PageController@store')->name('user.page.store');
            Route::get('/page/{menuID}/edit', 'User\PageController@edit')->name('user.page.edit');
            Route::post('/page/update', 'User\PageController@update')->name('user.page.update');
            Route::post('/page/delete', 'User\PageController@delete')->name('user.page.delete');
            Route::post('/page/bulk-delete', 'User\PageController@bulkDelete')->name('user.page.bulk.delete');
        });
        //user package extend route
        Route::get('/package-list', 'User\BuyPlanController@index')->name('user.plan.extend.index');
        Route::get('/package/checkout/{package_id}', 'User\BuyPlanController@checkout')->name('user.plan.extend.checkout');
        Route::post('/package/checkout', 'User\UserCheckoutController@checkout')->name('user.plan.checkout');
        //user footer route
        Route::get('/footer/text', 'User\FooterController@footerText')->name('user.footer.text');
        Route::post('/footer/update_footer_info/{language}', 'User\FooterController@updateFooterInfo')->name('user.footer.update_footer_info');
        Route::get('/footer/quick_links', 'User\FooterController@quickLinks')->name('user.footer.quick_links');
        Route::post('/footer/store_quick_link', 'User\FooterController@storeQuickLink')->name('user.footer.store_quick_link');
        Route::post('/footer/update_quick_link', 'User\FooterController@updateQuickLink')->name('user.footer.update_quick_link');
        Route::post('/footer/delete_quick_link', 'User\FooterController@deleteQuickLink')->name('user.footer.delete_quick_link');
        //user subscriber routes
        Route::get('/subscribers', 'User\SubscriberController@index')->name('user.subscriber.index');
        Route::get('/mailsubscriber', 'User\SubscriberController@mailsubscriber')->name('user.mailsubscriber');
        Route::post('/subscribers/sendmail', 'User\SubscriberController@subscsendmail')->name('user.subscribers.sendmail');
        Route::post('/subscriber/delete', 'User\SubscriberController@delete')->name('user.subscriber.delete');
        Route::post('/subscriber/bulk-delete', 'User\SubscriberController@bulkDelete')->name('user.subscriber.bulk.delete');

        Route::group(['middleware' => 'checkUserPermission:Request a Quote'], function () {
            // user Quote Form Builder Routes
            Route::get('/quote/visibility', 'User\QuoteController@visibility')->name('user.quote.visibility');
            Route::post('/quote/visibility/update', 'User\QuoteController@updateVisibility')->name('user.quote.visibility.update');
            Route::get('/quote/form', 'User\QuoteController@form')->name('user.quote.form');
            Route::post('/quote/form/store', 'User\QuoteController@formstore')->name('user.quote.form.store');
            Route::post('/quote/inputDelete', 'User\QuoteController@inputDelete')->name('user.quote.inputDelete');
            Route::get('/quote/{id}/inputEdit', 'User\QuoteController@inputEdit')->name('user.quote.inputEdit');
            Route::get('/quote/{id}/options', 'User\QuoteController@options')->name('user.quote.options');
            Route::post('/quote/inputUpdate', 'User\QuoteController@inputUpdate')->name('user.quote.inputUpdate');
            Route::post('/quote/delete', 'User\QuoteController@delete')->name('user.quote.delete');
            Route::post('/quote/bulk-delete', 'User\QuoteController@bulkDelete')->name('user.quote.bulk.delete');
            Route::post('/quote/orderUpdate', 'User\QuoteController@orderUpdate')->name('user.quote.orderUpdate');
            // user Quote Routes
            Route::get('/all/quotes', 'User\QuoteController@all')->name('user.all.quotes');
            Route::get('/pending/quotes', 'User\QuoteController@pending')->name('user.pending.quotes');
            Route::get('/processing/quotes', 'User\QuoteController@processing')->name('user.processing.quotes');
            Route::get('/completed/quotes', 'User\QuoteController@completed')->name('user.completed.quotes');
            Route::get('/rejected/quotes', 'User\QuoteController@rejected')->name('user.rejected.quotes');
            Route::post('/quotes/status', 'User\QuoteController@status')->name('user.quotes.status');
            Route::post('/quote/mail', 'User\QuoteController@mail')->name('user.quotes.mail');
        });
        // User vCard routes
        Route::group(['middleware' => 'checkUserPermission:vCard'], function () {
            Route::get('/vcard', 'User\VcardController@vcard')->name('user.vcard');
            Route::get('/vcard/create', 'User\VcardController@create')->name('user.vcard.create');
            Route::post('/vcard/store', 'User\VcardController@store')->name('user.vcard.store');
            Route::get('/vcard/{id}/edit', 'User\VcardController@edit')->name('user.vcard.edit');
            Route::post('/vcard/update', 'User\VcardController@update')->name('user.vcard.update');
            Route::post('/vcard/delete', 'User\VcardController@delete')->name('user.vcard.delete');
            Route::post('/vcard/bulk/delete', 'User\VcardController@bulkDelete')->name('user.vcard.bulk.delete');
            Route::get('/vcard/{id}/information', 'User\VcardController@information')->name('user.vcard.information');

            Route::get('/vcard/{id}/services', 'User\VcardController@services')->name('user.vcard.services');
            Route::post('/vcard/service/store', 'User\VcardController@serviceStore')->name('user.vcard.serviceStore');
            Route::post('/vcard/service/update', 'User\VcardController@serviceUpdate')->name('user.vcard.serviceUpdate');
            Route::post('/vcard/service/delete', 'User\VcardController@serviceDelete')->name('user.vcard.serviceDelete');
            Route::post('/vcard/bulk/service/delete', 'User\VcardController@bulkServiceDelete')->name('user.vcard.bulkServiceDelete');

            Route::get('/vcard/{id}/projects', 'User\VcardController@projects')->name('user.vcard.projects');
            Route::post('/vcard/project/store', 'User\VcardController@projectStore')->name('user.vcard.projectStore');
            Route::post('/vcard/project/update', 'User\VcardController@projectUpdate')->name('user.vcard.projectUpdate');
            Route::post('/vcard/project/delete', 'User\VcardController@projectDelete')->name('user.vcard.projectDelete');
            Route::post('/vcard/bulk/project/delete', 'User\VcardController@bulkProjectDelete')->name('user.vcard.bulkProjectDelete');

            Route::get('/vcard/{id}/testimonials', 'User\VcardController@testimonials')->name('user.vcard.testimonials');
            Route::post('/vcard/testimonial/store', 'User\VcardController@testimonialStore')->name('user.vcard.testimonialStore');
            Route::post('/vcard/testimonial/update', 'User\VcardController@testimonialUpdate')->name('user.vcard.testimonialUpdate');
            Route::post('/vcard/testimonial/delete', 'User\VcardController@testimonialDelete')->name('user.vcard.testimonialDelete');
            Route::post('/vcard/bulk/testimonial/delete', 'User\VcardController@bulkTestimonialDelete')->name('user.vcard.bulkTestimonialDelete');

            Route::get('/vcard/{id}/about', 'User\VcardController@about')->name('user.vcard.about');
            Route::post('/vcard/aboutUpdate', 'User\VcardController@aboutUpdate')->name('user.vcard.aboutUpdate');

            Route::get('/vcard/{id}/preferences', 'User\VcardController@preferences')->name('user.vcard.preferences');
            Route::post('/vcard/{id}/prefUpdate', 'User\VcardController@prefUpdate')->name('user.vcard.prefUpdate');

            Route::get('/vcard/{id}/color', 'User\VcardController@color')->name('user.vcard.color');
            Route::post('/vcard/{id}/colorUpdate', 'User\VcardController@colorUpdate')->name('user.vcard.colorUpdate');

            Route::get('/vcard/{id}/keywords', 'User\VcardController@keywords')->name('user.vcard.keywords');
            Route::post('/vcard/{id}/keywordsUpdate', 'User\VcardController@keywordsUpdate')->name('user.vcard.keywordsUpdate');
        });
        // user QR Builder
        Route::group(['middleware' => 'checkUserPermission:QR Builder'], function () {
            Route::get('/saved/qrs', 'User\QrController@index')->name('user.qrcode.index');
            Route::post('/saved/qr/delete', 'User\QrController@delete')->name('user.qrcode.delete');
            Route::post('/saved/qr/bulk-delete', 'User\QrController@bulkDelete')->name('user.qrcode.bulk.delete');
            Route::get('/qr-code', 'User\QrController@qrCode')->name('user.qrcode');
            Route::post('/qr-code/generate', 'User\QrController@generate')->withoutMiddleware('Demo')->name('user.qrcode.generate');
            Route::get('/qr-code/clear', 'User\QrController@clear')->name('user.qrcode.clear');
            Route::post('/qr-code/save', 'User\QrController@save')->name('user.qrcode.save');
        });

        //advertisement Route
        Route::prefix('advertisement')->group(function () {
            Route::get('settings', 'User\AdvertisementController@settings')->name('user.advertisement.settings');
            Route::post('settings/update', 'User\AdvertisementController@updateSettings')->name('user.advertisement.update_settings');
        });

        // user cv upload routes
        Route::get('/cv-upload', 'User\BasicController@cvUpload')->name('user.cv.upload');
        Route::post('/cv-upload/update', 'User\BasicController@updateCV')->name('user.cv.upload.update');
        Route::post('/cv-upload/delete', 'User\BasicController@deleteCV')->name('user.cv.upload.delete');
    });


    /*=======================================================
    ******************** Admin Routes **********************
    =======================================================*/

    Route::group(['prefix' => 'admin', 'middleware' => 'guest:admin'], function () {
        Route::get('/', 'Admin\LoginController@login')->name('admin.login');
        Route::post('/login', 'Admin\LoginController@authenticate')->name('admin.auth');

        Route::get('/mail-form', 'Admin\ForgetController@mailForm')->name('admin.forget.form');
        Route::post('/sendmail', 'Admin\ForgetController@sendmail')->name('admin.forget.mail')->middleware('Demo');
    });

    Route::get('/set-locale-admin', 'Admin\BasicController@setLocaleAdmin')->name('set-Locale-admin');

    Route::group(['prefix' => 'admin', 'middleware' => ['auth:admin', 'checkstatus', 'Demo', 'adminLang']], function () {
        // RTL check
        Route::get('/rtlcheck/{langid}', 'Admin\LanguageController@rtlcheck')->name('admin.rtlcheck');
        // admin redirect to dashboard route
        Route::get('/change-theme', 'Admin\DashboardController@changeTheme')->name('admin.theme.change');
        // Summernote image upload
        Route::post('/summernote/upload', 'Admin\SummernoteController@upload')->name('admin.summernote.upload');
        // Admin logout Route
        Route::get('/logout', 'Admin\LoginController@logout')->name('admin.logout');
        Route::group(['middleware' => 'checkpermission:Dashboard'], function () {
            // Admin Dashboard Routes
            Route::get('/dashboard', 'Admin\DashboardController@dashboard')->name('admin.dashboard');
        });
        // Admin Profile Routes
        Route::get('/changePassword', 'Admin\ProfileController@changePass')->name('admin.changePass');
        Route::post('/profile/updatePassword', 'Admin\ProfileController@updatePassword')->name('admin.updatePassword');
        Route::get('/profile/edit', 'Admin\ProfileController@editProfile')->name('admin.editProfile');
        Route::post('/profile/update', 'Admin\ProfileController@updateProfile')->name('admin.updateProfile');

        Route::group(['middleware' => 'checkpermission:Settings'], function () {

            // Admin Favicon Routes
            Route::get('/favicon', 'Admin\BasicController@favicon')->name('admin.favicon');
            Route::post('/favicon/post', 'Admin\BasicController@updatefav')->name('admin.favicon.update');

            // Admin Logo Routes
            Route::get('/logo', 'Admin\BasicController@logo')->name('admin.logo');
            Route::post('/logo/post', 'Admin\BasicController@updatelogo')->name('admin.logo.update');

            // Admin Preloader Routes
            Route::get('/preloader', 'Admin\BasicController@preloader')->name('admin.preloader');
            Route::post('/preloader/post', 'Admin\BasicController@updatepreloader')->name('admin.preloader.update');

            // Admin Basic Information Routes
            Route::get('/basicinfo', 'Admin\BasicController@basicinfo')->name('admin.basicinfo');
            Route::post('/basicinfo/post', 'Admin\BasicController@updatebasicinfo')->name('admin.basicinfo.update');

            // Admin Email Settings Routes
            Route::get('/mail-from-admin', 'Admin\EmailController@mailFromAdmin')->name('admin.mailFromAdmin');
            Route::post('/mail-from-admin/update', 'Admin\EmailController@updateMailFromAdmin')->name('admin.mailfromadmin.update');
            Route::get('/mail-to-admin', 'Admin\EmailController@mailToAdmin')->name('admin.mailToAdmin');
            Route::post('/mail-to-admin/update', 'Admin\EmailController@updateMailToAdmin')->name('admin.mailtoadmin.update');

            Route::get('/mail_templates', 'Admin\MailTemplateController@mailTemplates')->name('admin.mail_templates');
            Route::get('/edit_mail_template/{id}', 'Admin\MailTemplateController@editMailTemplate')->name('admin.edit_mail_template');
            Route::post('/update_mail_template/{id}', 'Admin\MailTemplateController@updateMailTemplate')->name('admin.update_mail_template');

            // Admin Scripts Routes
            Route::get('/script', 'Admin\BasicController@script')->name('admin.script');
            Route::post('/script/update', 'Admin\BasicController@updatescript')->name('admin.script.update');

            // Admin Social Routes
            Route::get('/social', 'Admin\SocialController@index')->name('admin.social.index');
            Route::post('/social/store', 'Admin\SocialController@store')->name('admin.social.store');
            Route::get('/social/{id}/edit', 'Admin\SocialController@edit')->name('admin.social.edit');
            Route::post('/social/update', 'Admin\SocialController@update')->name('admin.social.update');
            Route::post('/social/delete', 'Admin\SocialController@delete')->name('admin.social.delete');

            // Admin Maintanance Mode Routes
            Route::get('/maintainance', 'Admin\BasicController@maintainance')->name('admin.maintainance');
            Route::post('/maintainance/update', 'Admin\BasicController@updatemaintainance')->name('admin.maintainance.update');

            // Admin Section Customization Routes
            Route::get('/sections', 'Admin\BasicController@sections')->name('admin.sections.index');
            Route::post('/sections/update', 'Admin\BasicController@updatesections')->name('admin.sections.update');

            // Admin Cookie Alert Routes
            Route::get('/cookie-alert', 'Admin\BasicController@cookiealert')->name('admin.cookie.alert');
            Route::post('/cookie-alert/{langid}/update', 'Admin\BasicController@updatecookie')->name('admin.cookie.update');

            // basic settings seo route
            Route::get('/seo', 'Admin\BasicController@seo')->name('admin.seo');
            Route::post('/seo/update', 'Admin\BasicController@updateSEO')->name('admin.seo.update');

            // admin custom css
            Route::get('css', 'Admin\BasicController@css')->name('admin.css');
            Route::post('css/update', 'Admin\BasicController@updateCss')->name('admin.css.update');

            // admin custom js
            Route::get('js', 'Admin\BasicController@js')->name('admin.js');
            Route::post('js/update', 'Admin\BasicController@updateJs')->name('admin.js.update');
        });

        Route::group(['middleware' => 'checkpermission:Subscribers'], function () {
            // Admin Subscriber Routes
            Route::get('/subscribers', 'Admin\SubscriberController@index')->name('admin.subscriber.index');
            Route::get('/mailsubscriber', 'Admin\SubscriberController@mailsubscriber')->name('admin.mailsubscriber');
            Route::post('/subscribers/sendmail', 'Admin\SubscriberController@subscsendmail')->name('admin.subscribers.sendmail');
            Route::post('/subscriber/delete', 'Admin\SubscriberController@delete')->name('admin.subscriber.delete');
            Route::post('/subscriber/bulk-delete', 'Admin\SubscriberController@bulkDelete')->name('admin.subscriber.bulk.delete');
        });

        // MENU BUILDER
        Route::group(['middleware' => 'checkpermission:Menu Builder'], function () {
            Route::get('/menu-builder', 'Admin\MenuBuilderController@index')->name('admin.menu_builder.index');
            Route::post('/menu-builder/update', 'Admin\MenuBuilderController@update')->name('admin.menu_builder.update');
        });

        Route::group(['middleware' => 'checkpermission:Home Page'], function () {

            // Admin Hero Section Image & Text Routes
            Route::get('/herosection/imgtext', 'Admin\HerosectionController@imgtext')->name('admin.herosection.imgtext');
            Route::post('/herosection/{langid}/update', 'Admin\HerosectionController@update')->name('admin.herosection.update');

            // Admin Feature Routes
            Route::get('/features', 'Admin\FeatureController@index')->name('admin.feature.index');
            Route::post('/feature/store', 'Admin\FeatureController@store')->name('admin.feature.store');
            Route::get('/feature/{id}/edit', 'Admin\FeatureController@edit')->name('admin.feature.edit');
            Route::post('/feature/update', 'Admin\FeatureController@update')->name('admin.feature.update');
            Route::post('/feature/delete', 'Admin\FeatureController@delete')->name('admin.feature.delete');

            // Admin Work Process Routes
            Route::get('/process', 'Admin\ProcessController@index')->name('admin.process.index');
            Route::post('/process/store', 'Admin\ProcessController@store')->name('admin.process.store');
            Route::get('/process/{id}/edit', 'Admin\ProcessController@edit')->name('admin.process.edit');
            Route::post('/process/update', 'Admin\ProcessController@update')->name('admin.process.update');
            Route::post('/process/delete', 'Admin\ProcessController@delete')->name('admin.process.delete');

            // Admin Intro Section Routes
            Route::get('/introsection', 'Admin\IntrosectionController@index')->name('admin.introsection.index');
            Route::post('/introsection/{langid}/update', 'Admin\IntrosectionController@update')->name('admin.introsection.update');
            Route::post('/introsection/remove/image', 'Admin\IntrosectionController@removeImage')->name('admin.introsection.img.rmv');

            // Admin Testimonial Routes
            Route::get('/testimonials', 'Admin\TestimonialController@index')->name('admin.testimonial.index');
            Route::get('/testimonial/create', 'Admin\TestimonialController@create')->name('admin.testimonial.create');
            Route::post('/testimonial/store', 'Admin\TestimonialController@store')->name('admin.testimonial.store');
            Route::get('/testimonial/{id}/edit', 'Admin\TestimonialController@edit')->name('admin.testimonial.edit');
            Route::post('/testimonial/update', 'Admin\TestimonialController@update')->name('admin.testimonial.update');
            Route::post('/testimonial/update/image', 'Admin\TestimonialController@updateImage')->name('admin.testimonial.update.image');
            Route::post('/testimonial/delete', 'Admin\TestimonialController@delete')->name('admin.testimonial.delete');
            Route::post('/testimonialtext/{langid}/update', 'Admin\TestimonialController@textupdate')->name('admin.testimonialtext.update');

            // Admin home page text routes
            Route::get('/home-page-text-section', 'Admin\HomePageTextController@index')->name('admin.home.page.text.index');
            Route::post('/home-page-text-section/{langid}/update', 'Admin\HomePageTextController@update')->name('admin.home.page.text.update');

            // Admin Partner Routes
            Route::get('/partners', 'Admin\PartnerController@index')->name('admin.partner.index');
            Route::post('/partner/store', 'Admin\PartnerController@store')->name('admin.partner.store');
            Route::post('/partner/upload', 'Admin\PartnerController@upload')->name('admin.partner.upload');
            Route::get('/partner/{id}/edit', 'Admin\PartnerController@edit')->name('admin.partner.edit');
            Route::post('/partner/update', 'Admin\PartnerController@update')->name('admin.partner.update');
            Route::post('/partner/{id}/uploadUpdate', 'Admin\PartnerController@uploadUpdate')->name('admin.partner.uploadUpdate');
            Route::post('/partner/delete', 'Admin\PartnerController@delete')->name('admin.partner.delete');
        });

        Route::group(['middleware' => 'checkpermission:Pages'], function () {
            // Menu Manager Routes
            Route::get('/pages', 'Admin\PageController@index')->name('admin.page.index');
            Route::get('/page/create', 'Admin\PageController@create')->name('admin.page.create');
            Route::post('/page/store', 'Admin\PageController@store')->name('admin.page.store');
            Route::get('/page/{menuID}/edit', 'Admin\PageController@edit')->name('admin.page.edit');
            Route::post('/page/update', 'Admin\PageController@update')->name('admin.page.update');
            Route::post('/page/delete', 'Admin\PageController@delete')->name('admin.page.delete');
            Route::post('/page/bulk-delete', 'Admin\PageController@bulkDelete')->name('admin.page.bulk.delete');
        });

        Route::group(['middleware' => 'checkpermission:Footer'], function () {
            // Admin Footer Logo Text Routes
            Route::get('/footers', 'Admin\FooterController@index')->name('admin.footer.index');
            Route::post('/footer/{langid}/update', 'Admin\FooterController@update')->name('admin.footer.update');
            Route::post('/footer/remove/image', 'Admin\FooterController@removeImage')->name('admin.footer.rmvimg');

            // Admin Ulink Routes
            Route::get('/ulinks', 'Admin\UlinkController@index')->name('admin.ulink.index');
            Route::get('/ulink/create', 'Admin\UlinkController@create')->name('admin.ulink.create');
            Route::post('/ulink/store', 'Admin\UlinkController@store')->name('admin.ulink.store');
            Route::get('/ulink/{id}/edit', 'Admin\UlinkController@edit')->name('admin.ulink.edit');
            Route::post('/ulink/update', 'Admin\UlinkController@update')->name('admin.ulink.update');
            Route::post('/ulink/delete', 'Admin\UlinkController@delete')->name('admin.ulink.delete');
        });

        // Announcement Popup Routes
        Route::group(['middleware' => 'checkpermission:Announcement Popup'], function () {
            Route::get('popups', 'Admin\PopupController@index')->name('admin.popup.index');
            Route::get('popup/types', 'Admin\PopupController@types')->name('admin.popup.types');
            Route::get('popup/{id}/edit', 'Admin\PopupController@edit')->name('admin.popup.edit');
            Route::get('popup/create', 'Admin\PopupController@create')->name('admin.popup.create');
            Route::post('popup/store', 'Admin\PopupController@store')->name('admin.popup.store');;
            Route::post('popup/delete', 'Admin\PopupController@delete')->name('admin.popup.delete');
            Route::post('popup/bulk-delete', 'Admin\PopupController@bulkDelete')->name('admin.popup.bulk.delete');
            Route::post('popup/status', 'Admin\PopupController@status')->name('admin.popup.status');
            Route::post('popup/update', 'Admin\PopupController@update')->name('admin.popup.update');;
        });

        //advertisement

        Route::prefix('advertisement')->group(function () {
            Route::get('settings', 'Admin\AdvertisementController@index')->name('admin.advertisement.settings');
            Route::post('settings/update', 'Admin\AdvertisementController@update')->name('admin.advertisement.update');
        });

        Route::group(['middleware' => 'checkpermission:Registered Users'], function () {
            // Register User start
            Route::get('register/users', 'Admin\RegisterUserController@index')->name('admin.register.user');
            Route::post('register/user/store', 'Admin\RegisterUserController@store')->name('register.user.store');
            Route::post('register/users/ban', 'Admin\RegisterUserController@userban')->name('register.user.ban');
            Route::post('register/users/featured', 'Admin\RegisterUserController@userFeatured')->name('register.user.featured');
            Route::post('register/users/template', 'Admin\RegisterUserController@userTemplate')->name('register.user.template');
            Route::post('register/users/template/update', 'Admin\RegisterUserController@userUpdateTemplate')->name('register.user.updateTemplate');
            Route::post('register/users/email', 'Admin\RegisterUserController@emailStatus')->name('register.user.email');
            Route::get('register/user/details/{id}', 'Admin\RegisterUserController@view')->name('register.user.view');
            Route::post('/user/current-package/remove', 'Admin\RegisterUserController@removeCurrPackage')->name('user.currPackage.remove');
            Route::post('/user/current-package/change', 'Admin\RegisterUserController@changeCurrPackage')->name('user.currPackage.change');
            Route::post('/user/current-package/add', 'Admin\RegisterUserController@addCurrPackage')->name('user.currPackage.add');
            Route::post('/user/next-package/remove', 'Admin\RegisterUserController@removeNextPackage')->name('user.nextPackage.remove');
            Route::post('/user/next-package/change', 'Admin\RegisterUserController@changeNextPackage')->name('user.nextPackage.change');
            Route::post('/user/next-package/add', 'Admin\RegisterUserController@addNextPackage')->name('user.nextPackage.add');
            Route::post('register/user/delete', 'Admin\RegisterUserController@delete')->name('register.user.delete');
            Route::get('register/user/secret-login', 'Admin\RegisterUserController@secretLogin')->name('register.user.secretLogin');
            Route::post('register/user/bulk-delete', 'Admin\RegisterUserController@bulkDelete')->name('register.user.bulk.delete');
            Route::get('register/user/{id}/changePassword', 'Admin\RegisterUserController@changePass')->name('register.user.changePass');
            Route::post('register/user/updatePassword', 'Admin\RegisterUserController@updatePassword')->name('register.user.updatePassword');
            //Register User end
            // users vcards route start
            Route::get('register/user/vcard', 'Admin\UsersVcardsController@index')->name('register.user.vcards');
            Route::post('register/users/vcard/change-status', 'Admin\UsersVcardsController@changeStatus')->name('register.user.vcard.status');
            Route::post('register/users/vcard/template', 'Admin\UsersVcardsController@vcardTemplate')->name('register.user.vcard.template');
            Route::post('register/users/vcard/template/update', 'Admin\UsersVcardsController@vcardUpdateTemplate')->name('register.user.vcard.updateTemplate');
            Route::post('register/users/vcard/template', 'Admin\UsersVcardsController@vcardTemplate')->name('register.user.vcard.template');
            Route::post('register/users/vcard/delete', 'Admin\UsersVcardsController@destroy')->name('register.user.vcard.delete');
        });


        Route::group(['middleware' => 'checkpermission:FAQ Management'], function () {
            // Admin FAQ Routes
            Route::get('/faqs', 'Admin\FaqController@index')->name('admin.faq.index');
            Route::get('/faq/create', 'Admin\FaqController@create')->name('admin.faq.create');
            Route::post('/faq/store', 'Admin\FaqController@store')->name('admin.faq.store');
            Route::post('/faq/update', 'Admin\FaqController@update')->name('admin.faq.update');
            Route::post('/faq/delete', 'Admin\FaqController@delete')->name('admin.faq.delete');
            Route::post('/faq/bulk-delete', 'Admin\FaqController@bulkDelete')->name('admin.faq.bulk.delete');
        });


        Route::group(['middleware' => 'checkpermission:Blogs'], function () {
            // Admin Blog Category Routes
            Route::get('/bcategorys', 'Admin\BcategoryController@index')->name('admin.bcategory.index');
            Route::post('/bcategory/store', 'Admin\BcategoryController@store')->name('admin.bcategory.store');
            Route::post('/bcategory/update', 'Admin\BcategoryController@update')->name('admin.bcategory.update');
            Route::post('/bcategory/delete', 'Admin\BcategoryController@delete')->name('admin.bcategory.delete');
            Route::post('/bcategory/bulk-delete', 'Admin\BcategoryController@bulkDelete')->name('admin.bcategory.bulk.delete');


            // Admin Blog Routes
            Route::get('/blogs', 'Admin\BlogController@index')->name('admin.blog.index');
            Route::post('/blog/upload', 'Admin\BlogController@upload')->name('admin.blog.upload');
            Route::post('/blog/store', 'Admin\BlogController@store')->name('admin.blog.store');
            Route::get('/blog/{id}/edit', 'Admin\BlogController@edit')->name('admin.blog.edit');
            Route::post('/blog/update', 'Admin\BlogController@update')->name('admin.blog.update');
            Route::post('/blog/{id}/uploadUpdate', 'Admin\BlogController@uploadUpdate')->name('admin.blog.uploadUpdate');
            Route::post('/blog/delete', 'Admin\BlogController@delete')->name('admin.blog.delete');
            Route::post('/blog/bulk-delete', 'Admin\BlogController@bulkDelete')->name('admin.blog.bulk.delete');
            Route::get('/blog/{langid}/getcats', 'Admin\BlogController@getcats')->name('admin.blog.getcats');
        });

        Route::group(['middleware' => 'checkpermission:Sitemap'], function () {
            Route::get('/sitemap', 'Admin\SitemapController@index')->name('admin.sitemap.index');
            Route::post('/sitemap/store', 'Admin\SitemapController@store')->name('admin.sitemap.store');
            Route::get('/sitemap/{id}/update', 'Admin\SitemapController@update')->name('admin.sitemap.update');
            Route::post('/sitemap/{id}/delete', 'Admin\SitemapController@delete')->name('admin.sitemap.delete');
            Route::post('/sitemap/download', 'Admin\SitemapController@download')->name('admin.sitemap.download');
        });

        Route::group(['middleware' => 'checkpermission:Contact Page'], function () {
            // Admin Contact Routes
            Route::get('/contact', 'Admin\ContactController@index')->name('admin.contact.index');
            Route::post('/contact/{langid}/post', 'Admin\ContactController@update')->name('admin.contact.update');
        });

        Route::group(['middleware' => 'checkpermission:Payment Gateways'], function () {
            // Admin Online Gateways Routes
            Route::get('/gateways', 'Admin\GatewayController@index')->name('admin.gateway.index');
            Route::post('/stripe/update', 'Admin\GatewayController@stripeUpdate')->name('admin.stripe.update');
            Route::post('/anet/update', 'Admin\GatewayController@anetUpdate')->name('admin.anet.update');
            Route::post('/paypal/update', 'Admin\GatewayController@paypalUpdate')->name('admin.paypal.update');
            Route::post('/paystack/update', 'Admin\GatewayController@paystackUpdate')->name('admin.paystack.update');
            Route::post('/paytm/update', 'Admin\GatewayController@paytmUpdate')->name('admin.paytm.update');
            Route::post('/flutterwave/update', 'Admin\GatewayController@flutterwaveUpdate')->name('admin.flutterwave.update');
            Route::post('/instamojo/update', 'Admin\GatewayController@instamojoUpdate')->name('admin.instamojo.update');
            Route::post('/mollie/update', 'Admin\GatewayController@mollieUpdate')->name('admin.mollie.update');
            Route::post('/razorpay/update', 'Admin\GatewayController@razorpayUpdate')->name('admin.razorpay.update');
            Route::post('/mercadopago/update', 'Admin\GatewayController@mercadopagoUpdate')->name('admin.mercadopago.update');
            Route::post('/phonepe/update', 'Admin\GatewayController@phonepeUpdate')->name('admin.phonepe.update');

            Route::post('/perfect-money/update', 'Admin\GatewayController@perfect_moneyUpdate')->name('admin.perfect_money.update');
            Route::post('/xendit/update', 'Admin\GatewayController@xenditUpdate')->name('admin.xendit.update');

            Route::post('/myfatoorah/update', 'Admin\GatewayController@myfatoorahUpdate')->name('admin.myfatoorah.update');
            Route::post('/yoco/update', 'Admin\GatewayController@yocoUpdate')->name('admin.yoco.update');
            Route::post('/toyyibpay/update', 'Admin\GatewayController@toyyibpayUpdate')->name('admin.toyyibpay.update');
            Route::post('/paytabs/update', 'Admin\GatewayController@paytabsUpdate')->name('admin.paytabs.update');
            Route::post('/iyzico/update', 'Admin\GatewayController@iyzicoUpdate')->name('admin.iyzico.update');
            Route::post('/midtrans/update', 'Admin\GatewayController@midtransUpdate')->name('admin.midtrans.update');

            // Admin Offline Gateway Routes
            Route::get('/offline/gateways', 'Admin\GatewayController@offline')->name('admin.gateway.offline');
            Route::post('/offline/gateway/store', 'Admin\GatewayController@store')->name('admin.gateway.offline.store');
            Route::post('/offline/gateway/update', 'Admin\GatewayController@update')->name('admin.gateway.offline.update');
            Route::post('/offline/status', 'Admin\GatewayController@status')->name('admin.offline.status');
            Route::post('/offline/gateway/delete', 'Admin\GatewayController@delete')->name('admin.offline.gateway.delete');
        });

        Route::group(['middleware' => 'checkpermission:Role Management'], function () {
            // Admin Roles Routes
            Route::get('/roles', 'Admin\RoleController@index')->name('admin.role.index');
            Route::post('/role/store', 'Admin\RoleController@store')->name('admin.role.store');
            Route::post('/role/update', 'Admin\RoleController@update')->name('admin.role.update');
            Route::post('/role/delete', 'Admin\RoleController@delete')->name('admin.role.delete');
            Route::get('role/{id}/permissions/manage', 'Admin\RoleController@managePermissions')->name('admin.role.permissions.manage');
            Route::post('role/permissions/update', 'Admin\RoleController@updatePermissions')->name('admin.role.permissions.update');
        });

        Route::group(['middleware' => 'checkpermission:Admins Management'], function () {
            // Admin Users Routes
            Route::get('/users', 'Admin\UserController@index')->name('admin.user.index');
            Route::post('/user/upload', 'Admin\UserController@upload')->name('admin.user.upload');
            Route::post('/user/store', 'Admin\UserController@store')->name('admin.user.store');
            Route::get('/user/{id}/edit', 'Admin\UserController@edit')->name('admin.user.edit');
            Route::post('/user/update', 'Admin\UserController@update')->name('admin.user.update');
            Route::post('/user/{id}/uploadUpdate', 'Admin\UserController@uploadUpdate')->name('admin.user.uploadUpdate');
            Route::post('/user/delete', 'Admin\UserController@delete')->name('admin.user.delete');
        });

        Route::group(['middleware' => 'checkpermission:Language Management'], function () {
            // Admin Language Routes
            Route::get('/languages', 'Admin\LanguageController@index')->name('admin.language.index');
            Route::get('/language/{id}/edit', 'Admin\LanguageController@edit')->name('admin.language.edit');
            Route::get('/language/{id}/edit/keyword', 'Admin\LanguageController@editKeyword')->name('admin.language.editKeyword');
            Route::get('/language/{id}/edit/admin-keyword', 'Admin\LanguageController@editAdminKeyword')->name('admin.language.editAdminKeyword');


            Route::get('/language/{id}/edit/user-keyword', 'Admin\TenantLanguageController@editUserKeyword')->name('admin.language.editUserKeyword');
            Route::post('/language/{id}/update/user-dashboard-keyword', 'Admin\TenantLanguageController@updateUserDashboardKeyword')->name('admin.language.updateUserDashboardKeyword');
            Route::get('/language/{id}/edit/customer-keyword', 'Admin\TenantLanguageController@editCustomerKeyword')->name('admin.language.editCustomerKeyword');
            Route::post('/language/{id}/update/customer/keyword', 'Admin\TenantLanguageController@updateCustomerKeyword')->name('admin.language.updateCustomerKeyword');


            Route::post('/language/store', 'Admin\LanguageController@store')->name('admin.language.store');
            Route::post('/language/upload', 'Admin\LanguageController@upload')->name('admin.language.upload');
            Route::post('/language/{id}/uploadUpdate', 'Admin\LanguageController@uploadUpdate')->name('admin.language.uploadUpdate');
            Route::post('/language/{id}/default', 'Admin\LanguageController@default')->name('admin.language.default');
            Route::post('/language/{id}/delete', 'Admin\LanguageController@delete')->name('admin.language.delete');
            Route::post('/language/update', 'Admin\LanguageController@update')->name('admin.language.update');
            Route::post('/language/{id}/update/keyword', 'Admin\LanguageController@updateKeyword')->name('admin.language.updateKeyword');

            Route::post('/language/add-keyword/user-dashboard', 'Admin\LanguageController@addKeywordForUserDashboard')->name('admin.language.add_keyword.user.dashboard');

            Route::post('/add-keyword', 'Admin\LanguageController@addKeyword')->name('admin.language_management.add_keyword');
            Route::post('/add-frontend-keyword', 'Admin\LanguageController@addFrontKeyword')->name('admin.language_management.add_front_keyword');

            Route::post('tenant/language/{id}/add/keyword', 'Admin\TenantLanguageController@addKeyword')->name('admin.tenant_language.addKeyword');
        });

        // Admin Cache Clear Routes
        Route::get('/cache-clear', 'Admin\CacheController@clear')->name('admin.cache.clear');

        Route::group(['middleware' => 'checkpermission:Packages'], function () {
            // Package Settings routes
            Route::get('/package/settings', 'Admin\PackageController@settings')->name('admin.package.settings');
            Route::post('/package/settings', 'Admin\PackageController@updateSettings')->name('admin.package.settings');
            // Package Settings routes
            Route::get('/package/features', 'Admin\PackageController@features')->name('admin.package.features');
            Route::post('/package/features', 'Admin\PackageController@updateFeatures')->name('admin.package.features');
            // Package routes
            Route::get('packages', 'Admin\PackageController@index')->name('admin.package.index');
            Route::post('package/upload', 'Admin\PackageController@upload')->name('admin.package.upload');
            Route::post('package/store', 'Admin\PackageController@store')->name('admin.package.store');
            Route::get('package/{id}/edit', 'Admin\PackageController@edit')->name('admin.package.edit');
            Route::post('package/update', 'Admin\PackageController@update')->name('admin.package.update');
            Route::post('package/{id}/uploadUpdate', 'Admin\PackageController@uploadUpdate')->name('admin.package.uploadUpdate');
            Route::post('package/delete', 'Admin\PackageController@delete')->name('admin.package.delete');
            Route::post('package/bulk-delete', 'Admin\PackageController@bulkDelete')->name('admin.package.bulk.delete');

            // Admin Coupon Routes
            Route::get('/coupon', 'Admin\CouponController@index')->name('admin.coupon.index');
            Route::post('/coupon/store', 'Admin\CouponController@store')->name('admin.coupon.store');
            Route::get('/coupon/{id}/edit', 'Admin\CouponController@edit')->name('admin.coupon.edit');
            Route::post('/coupon/update', 'Admin\CouponController@update')->name('admin.coupon.update');
            Route::post('/coupon/delete', 'Admin\CouponController@delete')->name('admin.coupon.delete');
            // Admin Coupon Routes End
        });

        Route::group(['middleware' => 'checkpermission:Payment Log'], function () {
            // Payment Log
            Route::get('/payment-log', 'Admin\PaymentLogController@index')->name('admin.payment-log.index');
            Route::post('/payment-log/update', 'Admin\PaymentLogController@update')->name('admin.payment-log.update');
        });

        // Custom Domains
        Route::group(['middleware' => 'checkpermission:Custom Domains'], function () {
            Route::get('/domains', 'Admin\CustomDomainController@index')->name('admin.custom-domain.index');
            Route::get('/domain/texts', 'Admin\CustomDomainController@texts')->name('admin.custom-domain.texts');
            Route::post('/domain/texts', 'Admin\CustomDomainController@updateTexts')->name('admin.custom-domain.texts');
            Route::post('/domain/status', 'Admin\CustomDomainController@status')->name('admin.custom-domain.status');
            Route::post('/domain/mail', 'Admin\CustomDomainController@mail')->name('admin.custom-domain.mail');
            Route::post('/domain/delete', 'Admin\CustomDomainController@delete')->name('admin.custom-domain.delete');
            Route::post('/domain/bulk-delete', 'Admin\CustomDomainController@bulkDelete')->name('admin.custom-domain.bulk.delete');
        });

        // Subdomains
        Route::group(['middleware' => 'checkpermission:Subdomains'], function () {
            Route::get('/subdomains', 'Admin\SubdomainController@index')->name('admin.subdomain.index');
            Route::post('/subdomain/status', 'Admin\SubdomainController@status')->name('admin.subdomain.status');
            Route::post('/subdomain/mail', 'Admin\SubdomainController@mail')->name('admin.subdomain.mail');
        });
    });

    Route::group(['middleware' => ['web']], function () {
        Route::post('/coupon', 'Front\CheckoutController@coupon')->name('front.membership.coupon')->middleware('setlang');
        Route::post('/membership/checkout', 'Front\CheckoutController@checkout')->name('front.membership.checkout')->middleware('setlang');
        Route::post('/payment/instructions', 'Front\FrontendController@paymentInstruction')->name('front.payment.instructions');
        Route::post('/contact/message', 'Front\FrontendController@contactMessage')->name('front.contact.message');
        Route::post('/admin/contact-msg', 'Front\FrontendController@adminContactMessage')->name('front.admin.contact.message')->middleware('setlang');

        //checkout payment gateway routes
        Route::prefix('membership')->group(function () {
            Route::get('paypal/success', "Payment\PaypalController@successPayment")->name('membership.paypal.success');
            Route::get('paypal/cancel', "Payment\PaypalController@cancelPayment")->name('membership.paypal.cancel');
            Route::get('stripe/cancel', "Payment\StripeController@cancelPayment")->name('membership.stripe.cancel');
            Route::post('paytm/payment-status', "Payment\PaytmController@paymentStatus")->name('membership.paytm.status');
            Route::get('paystack/success', 'Payment\PaystackController@successPayment')->name('membership.paystack.success');
            Route::post('mercadopago/cancel', 'Payment\paymenMercadopagoController@cancelPayment')->name('membership.mercadopago.cancel');
            Route::post('mercadopago/success', 'Payment\MercadopagoController@successPayment')->name('membership.mercadopago.success');
            Route::post('razorpay/success', 'Payment\RazorpayController@successPayment')->name('membership.razorpay.success');
            Route::post('razorpay/cancel', 'Payment\RazorpayController@cancelPayment')->name('membership.razorpay.cancel');
            Route::get('instamojo/success', 'Payment\InstamojoController@successPayment')->name('membership.instamojo.success');
            Route::post('instamojo/cancel', 'Payment\InstamojoController@cancelPayment')->name('membership.instamojo.cancel');
            Route::post('flutterwave/success', 'Payment\FlutterWaveController@successPayment')->name('membership.flutterwave.success');
            Route::post('flutterwave/cancel', 'Payment\FlutterWaveController@cancelPayment')->name('membership.flutterwave.cancel');
            Route::get('/mollie/success', 'Payment\MollieController@successPayment')->name('membership.mollie.success');
            Route::post('mollie/cancel', 'Payment\MollieController@cancelPayment')->name('membership.mollie.cancel');
            Route::get('anet/cancel', 'Payment\AuthorizenetController@cancelPayment')->name('membership.anet.cancel');

            Route::get('/phonepe/success', 'Payment\PhonePeController@successPayment')->name('membership.phonepe.success');
            Route::get('phonepe/cancel', 'Payment\PhonePeController@cancelPayment')->name('membership.phonepe.cancel');

            Route::get('/perfect_money/success', 'Payment\PerfectMoneyController@successPayment')->name('membership.perfect_money.success');
            Route::get('perfect_money/cancel', 'Payment\PerfectMoneyController@cancelPayment')->name('membership.perfect_money.cancel');

            Route::get('/xendit/success', 'Payment\XenditController@successPayment')->name('membership.xendit.success');
            Route::get('/yoco/success', 'Payment\YocoController@successPayment')->name('membership.yoco.success');
            Route::get('/toyyibpay/success', 'Payment\ToyyibpayController@successPayment')->name('membership.toyyibpay.success');
            Route::post('/paytabs/success', 'Payment\PaytabsController@successPayment')->name('membership.paytabs.success');
            Route::get('/midtrans/success', 'Payment\MidtransController@successPayment')->name('membership.midtrans.success');
            Route::post('/iyzico/success', 'Payment\IyzicoController@successPayment')->name('membership.iyzico.success');

            Route::get('/offline/success', 'Front\CheckoutController@offlineSuccess')->name('membership.offline.success')->middleware('setlang');
            Route::get('/trial/success', 'Front\CheckoutController@trialSuccess')->name('membership.trial.success')->middleware('setlang');
        });
    });
});
$parsedUrl = parse_url(url()->current());
$host = str_replace("www.", "", $parsedUrl['host']);
if (array_key_exists('host', $parsedUrl)) {
    // if it is a path based URL
    if ($host == env('WEBSITE_HOST')) {
        $domain = $domain;
        $prefix = '/{username}';
    }
    // if it is a subdomain / custom domain
    else {
        if (!app()->runningInConsole()) {
            if (substr($_SERVER['HTTP_HOST'], 0, 4) === 'www.') {
                $domain = 'www.{domain}';
            } else {
                $domain = '{domain}';
            }
        }
        $prefix = '';
    }
}
Route::group([
    'domain' => $domain,
    'prefix' => $prefix,
    // 'middleware' => ['userWebsiteLanguageMiddleware']
], function () {
    Route::get('/', 'Front\FrontendController@userDetailView')->name('front.user.detail.view');

    Route::group(['middleware' => ['routeAccess:Service']], function () {
        Route::get('/services', 'Front\FrontendController@userServices')->name('front.user.services');
        Route::get('/service/{slug}/{id}', 'Front\FrontendController@userServiceDetail')->name('front.user.service.detail');
    });
    Route::group(['middleware' => ['routeAccess:Blog']], function () {
        Route::get('/blogs', 'Front\FrontendController@userBlogs')->name('front.user.blogs');
        Route::get('/blog/{slug}/{id}', 'Front\FrontendController@userBlogDetail')->name('front.user.blog.detail');
        Route::post('/post/{id}/make-bookmarsk', 'Front\FrontendController@makeBookmarkBlog')->name('front.user.make_bookmark');
    });
    Route::get('/gallery', 'Front\FrontendController@userGallery')->name('front.user.galleries');

    Route::group(['middleware' => ['routeAccess:Hotel Booking', 'Demo']], function () {
        Route::get('/rooms', 'Front\RoomController@rooms')->name('front.user.rooms');
        Route::get('/room/{id}/{slug}', 'Front\RoomController@roomDetails')->name('front.user.room_details');
        Route::post('/room/store_review/{id}', 'Front\RoomController@storeReview')->name('front.user.room.store_review');
        Route::post('/room-booking/apply-coupon', 'Front\RoomController@applyCoupon')->name('front.user.apply_coupon');
        Route::post('/room-booking', 'Front\RoomBookingController@makeRoomBooking')->name('front.user.room_booking');
        Route::get('/room_booking/paypal/notify', 'User\Payment\PaypalController@successPayment')->name('front.user.room_booking.notify');

        Route::post('/room_booking/paytm/notify', 'User\Payment\PaytmController@paymentStatus')->name('front.user.room_booking.paytm.notify');

        Route::post('/room_booking/paytm/notify', 'User\Payment\PaytmController@paymentStatus')->name('front.user.room_booking.stripe.notify');

        Route::get('/room_booking/instamojo/notify', 'User\Payment\InstamojoController@successPayment')->name('front.user.room_booking.instamojo.notify');

        Route::get('/room_booking/paystack/notify', 'User\Payment\PaystackController@successPayment')->name('front.user.room_booking.paystack.notify');

        Route::post('/room_booking/flutterwave/notify', 'User\Payment\FlutterWaveController@successPayment')->name('front.user.room_booking.flutterwave.notify');

        Route::get('/room_booking/mollie/notify', 'User\Payment\MollieController@successPayment')->name('front.user.room_booking.mollie.notify');

        Route::post('/room_booking/razorpay/notify', 'User\Payment\RazorpayController@successPayment')->name('front.user.room_booking.razorpay.notify');

        Route::get('/room_booking/mercadopago/notify', 'User\Payment\MercadopagoController@successPayment')->name('front.user.room_booking.mercadopago.notify');

        Route::get('/room_booking/phonepe/notify', 'User\Payment\PhonePeController@successPayment')->name('front.user.room_booking.phonepe.notify');

        Route::get('/room_booking/perfect-money/notify', 'User\Payment\PerfectMoneyController@successPayment')->name('front.user.room_booking.perfect_money.notify');

        Route::get('/room_booking/xendit/notify', 'User\Payment\XenditController@successPayment')->name('front.user.room_booking.xendit.notify');

        Route::get('/room_booking/yoco/notify', 'User\Payment\YocoController@successPayment')->name('front.user.room_booking.yoco.notify');
        Route::get('/room_booking/toyyibpay/notify', 'User\Payment\ToyyibpayController@successPayment')->name('front.user.room_booking.toyyibpay.notify');

        Route::post('/room_booking/paytabs/notify', 'User\Payment\PaytabsController@successPayment')->name('front.user.room_booking.paytabs.notify');
        Route::get('/room_booking/midtrans/notify', 'User\Payment\MidtransController@successPayment')->name('front.user.room_booking.midtrans.notify');

        Route::post('/room_booking/iyzico/notify', 'User\Payment\IyzicoController@successPayment')->name('front.user.room_booking.iyzico.notify');

        Route::get('/room_booking/cancel', 'Front\RoomBookingController@cancel')->name('front.user.room_booking.cancel');
        Route::get('/room_booking/complete', 'Front\RoomBooking@complete')->name('front.user.room_booking.complete');
    });

    // start course management routes
    Route::group(['middleware' => ['routeAccess:Course Management', 'Demo']], function () {
        Route::get('/courses', 'Front\CourseManagement\CourseController@courses')->name('front.user.courses');
        Route::get('/course/{slug}', 'Front\CourseManagement\CourseController@details')->name('front.user.course.details');
        Route::post('/course-enrolment/apply-coupon', 'Front\CourseManagement\CourseController@applyCoupon')->name('front.user.course.enrolment.apply.coupon');
        Route::post('/course-enrolment/{id}', 'Front\CourseManagement\EnrolmentController@enrolment')->name('front.user.course.enrolment');
        Route::post('/course/{id}/store-feedback', 'Front\CourseManagement\CourseController@storeFeedback')->name('front.user.course.store_feedback');

        Route::get('/instructors', 'Front\InstructorController@instructors')->name('front.user.instructors');
        //  start course enrollment payment gateway route
        Route::get('/course-enrolment/paypal/notify', 'User\CourseManagement\Payment\PayPalController@notify')->name('course_enrolment.paypal.notify');

        Route::get('/course-enrolment/instamojo/notify', 'User\CourseManagement\Payment\InstamojoController@notify')->name('course_enrolment.instamojo.notify');

        Route::get('/course-enrolment/paystack/notify', 'User\CourseManagement\Payment\PaystackController@notify')->name('course_enrolment.paystack.notify');

        Route::post('/course-enrolment/flutterwave/notify', 'User\CourseManagement\Payment\FlutterwaveController@notify')->name('course_enrolment.flutterwave.notify');

        Route::post('/course-enrolment/razorpay/notify', 'User\CourseManagement\Payment\RazorpayController@notify')->name('course_enrolment.razorpay.notify');

        Route::get('/course-enrolment/mercadopago/notify', 'User\CourseManagement\Payment\MercadoPagoController@notify')->name('course_enrolment.mercadopago.notify');

        Route::get('/course-enrolment/mollie/notify', 'User\CourseManagement\Payment\MollieController@notify')->name('course_enrolment.mollie.notify');

        Route::post('/course-enrolment/paytm/notify', 'User\CourseManagement\Payment\PaytmController@notify')->name('course_enrolment.paytm.notify');

        Route::get('/course-enrolment/phonepe/notify', 'User\CourseManagement\Payment\PhonePeController@notify')->name('course_enrolment.phonepe.notify');

        Route::get('/course-enrolment/perfect-money/notify', 'User\CourseManagement\Payment\PerfectMoneyController@notify')->name('course_enrolment.perfect_money.notify');

        Route::get('/course-enrolment/xendit/notify', 'User\CourseManagement\Payment\XenditController@notify')->name('course_enrolment.xendit.notify');
        Route::get('/course-enrolment/yoco/notify', 'User\CourseManagement\Payment\YocoController@notify')->name('course_enrolment.yoco.notify');
        Route::get('/course-enrolment/toyyibpay/notify', 'User\CourseManagement\Payment\ToyyibpayController@notify')->name('course_enrolment.toyyibpay.notify');

        Route::post('/course-enrolment/paytabs/notify', 'User\CourseManagement\Payment\PaytabsController@notify')->name('course_enrolment.paytabs.notify');
        Route::get('/course-enrolment/midtrans/notify', 'User\CourseManagement\Payment\MidtransController@notify')->name('course_enrolment.midtrans.notify');
        Route::post('/course-enrolment/iyzico/notify', 'User\CourseManagement\Payment\IyzicoController@notify')->name('course_enrolment.iyzico.notify');

        // end course enrolment route

        Route::get('/course-enrolment/{id}/complete/{via?}', 'Front\CourseManagement\EnrolmentController@complete')->name('front.user.course_enrolment.complete');

        Route::get('/course-enrolment/{id}/cancel', 'Front\CourseManagement\EnrolmentController@cancel')->name('front.user.course_enrolment.cancel');
    });
    // end course management routes
    Route::group(['middleware' => ['routeAccess:Donation Management', 'Demo']], function () {
        Route::get('/causes', 'Front\DonationManagement\CauseController@index')->name('front.user.causes');
        Route::get('/cause/{slug}', 'Front\DonationManagement\CauseController@details')->name('front.user.causesDetails');
        //causes donation payment
        Route::post('/cause/payment', 'Front\DonationManagement\DonationController@makePayment')->name('front.user.causes.payment');
        Route::get('/cause-donation/paypal/notify', 'User\DonationManagement\Payment\PayPalController@notify')->name('cause_donation.paypal.notify');
        Route::get('/cause-donation/instamojo/notify', 'User\DonationManagement\Payment\InstamojoController@notify')->name('cause_donate.instamojo.notify');
        Route::get('/cause-donation/paystack/notify', 'User\DonationManagement\Payment\PaystackController@notify')->name('cause_donate.paystack.notify');
        Route::post('/cause-donation/flutterwave/notify', 'User\DonationManagement\Payment\FlutterwaveController@notify')->name('cause_donate.flutterwave.notify');
        Route::post('/cause-donation/razorpay/notify', 'User\DonationManagement\Payment\RazorpayController@notify')->name('cause_donate.razorpay.notify');
        Route::get('/cause-donation/mercadopago/notify', 'User\DonationManagement\Payment\MercadoPagoController@notify')->name('cause_donate.mercadopago.notify');
        Route::get('/cause-donation/mollie/notify', 'User\DonationManagement\Payment\MollieController@notify')->name('cause_donate.mollie.notify');
        Route::post('/cause-donation/paytm/notify', 'User\DonationManagement\Payment\PaytmController@notify')->name('cause_donate.paytm.notify');
        Route::get('/cause-donation/phonepe/notify', 'User\DonationManagement\Payment\PhonePeController@notify')->name('cause_donation.phonepe.notify');

        Route::get('/cause-donation/perfect-money/notify', 'User\DonationManagement\Payment\PerfectMoneyController@notify')->name('cause_donation.perfect_money.notify');

        Route::get('/cause-donation/xendit/notify', 'User\DonationManagement\Payment\XenditController@notify')->name('cause_donation.xendit.notify');

        Route::get('/cause-donation/yoco/notify', 'User\DonationManagement\Payment\YocoController@notify')->name('cause_donation.yoco.notify');
        Route::get('/cause-donation/toyyibpay/notify', 'User\DonationManagement\Payment\ToyyibpayController@notify')->name('cause_donation.toyyibpay.notify');

        Route::post('/cause-donation/paytabs/notify', 'User\DonationManagement\Payment\PaytabsController@notify')->name('cause_donation.paytabs.notify');

        Route::get('/cause-donation/midtrans/notify', 'User\DonationManagement\Payment\MidtransController@notify')->name('cause_donation.midtrans.notify');
        Route::post('/cause-donation/iyzico/notify', 'User\DonationManagement\Payment\IyzicoController@notify')->name('cause_donation.iyzico.notify');

        Route::get('/cause-donation/complete/', 'Front\DonationManagement\DonationController@complete')->name('front.user.cause_donate.complete');
        Route::get('/cause-donation/{id}/cancel', 'Front\DonationManagement\DonationController@cancel')->name('front.user.cause_donate.cancel');
    });

    Route::prefix('/user')->middleware(['guest:customer', 'routeAccess:Ecommerce|Hotel Booking|Course Management|Donation Management'])->group(function () {
        // user redirect to login page route
        Route::get('/login',  'Front\CustomerController@login')->name('customer.login');
        // user login submit route
        Route::post('/login-submit', 'Front\CustomerController@loginSubmit')->name('customer.login_submit');
        // user forget password route
        Route::get('/forget-password', 'Front\CustomerController@forgetPassword')->name('customer.forget_password');
        // send mail to user for forget password route
        Route::post('/send-forget-password-mail', 'Front\CustomerController@sendMail')->name('customer.send_forget_password_mail')->middleware('Demo');
        // reset password route
        Route::get('/reset-password', 'Front\CustomerController@resetPassword')->name('customer.reset_password');
        // user reset password submit route
        Route::post('/reset-password-submit', 'Front\CustomerController@resetPasswordSubmit')->name('customer.reset_password_submit')->middleware('Demo');
        // user redirect to signup page route
        Route::get('/signup', 'Front\CustomerController@signup')->name('customer.signup');
        // user signup submit route
        Route::post('/signup-submit', 'Front\CustomerController@signupSubmit')->name('customer.signup.submit')->middleware('Demo');
        // signup verify route
        Route::get('/signup-verify/{token}', 'Front\CustomerController@signupVerify')->name('customer.signup.verify');
    });


    Route::prefix('/user')->middleware(['accountStatus', 'checkWebsiteOwner'])->group(function () {
        // course curriculum route
        Route::get('/my-course/{id}/curriculum', 'Front\CustomerController@curriculum')->name('customer.my_course.curriculum');
    });

    Route::prefix('/customer')->middleware(['auth:customer', 'accountStatus', 'checkWebsiteOwner', 'routeAccess:Ecommerce|Hotel Booking|Course Management|Donation Management|Blog', 'Demo'])->group(function () {
        // user redirect to dashboard route
        Route::get('/dashboard', 'Front\CustomerController@redirectToDashboard')->name('customer.dashboard');

        // all bookmarks route
        Route::get('/my-bookmarks', 'Front\CustomerController@myBookmarks')->name('customer.my_bookmarks');


        Route::get('/billing/details', 'Front\CustomerController@billingdetails')->name('customer.billing-details')->middleware('routeAccess:Ecommerce|Course Management');
        Route::post('/billing/details/update', 'Front\CustomerController@billingupdate')->name('customer.billing-update');
        // edit profile route
        Route::get('/edit-profile', 'Front\CustomerController@editProfile')->name('customer.edit_profile');
        // update profile route
        Route::post('/update-profile', 'Front\CustomerController@updateProfile')->name('customer.update_profile');
        // customer Panel
        Route::get('/change-password',  'Front\CustomerController@changePassword')->name('customer.change_password');
        // update password route
        Route::post('/update-password',  'Front\CustomerController@updatePassword')->name('customer.update_password');
        // user logout attempt route
        Route::get('/logout',  'Front\CustomerController@logoutSubmit')->name('customer.logout');
        // all ads route
        Route::middleware('routeAccess:Ecommerce')->group(function () {
            Route::get('/shipping/details', 'Front\CustomerController@shippingdetails')->name('customer.shpping-details');
            Route::post('/shipping/details/update', 'Front\CustomerController@shippingupdate')->name('customer.shipping-update');
            //user order
            Route::get('/order/{id}', 'Front\CustomerController@orderdetails')->name('customer.orders-details');
            Route::get('/orders', 'Front\CustomerController@customerOrders')->name('customer.orders');
            Route::get('/wishlist', 'Front\CustomerController@customerWishlist')->name('customer.wishlist');
            Route::get('/remove-from-wishlist/{id}', 'Front\CustomerController@removefromWish')->name('customer.removefromWish');
        });

        Route::middleware('routeAccess:Donation Management')->group(function () {
            //  donation route
            Route::get('/donations', 'Front\CustomerController@donations')->name('customer.donations');
        });

        Route::middleware('routeAccess:Hotel Booking')->group(function () {
            // room booking routes
            Route::get('/room-bookings', 'Front\CustomerController@roomBookings')->name('customer.roomBookings');
            // room booking details route
            Route::get('/room_booking_details/{id}', 'Front\CustomerController@roomBookingDetails')->name('customer.room_booking_details');
        });
        Route::middleware('routeAccess:Course Management')->group(function () {
            // all enrolment courses route
            Route::get('/my-courses', 'Front\CustomerController@myCourses')->name('customer.my_courses');

            // download lesson file route
            Route::post('/my-course/curriculum/{id}/download-file', 'Front\CustomerController@downloadFile')->name('customer.my_course.curriculum.download_file');
            // check quiz's answer route
            Route::get('/my-course/curriculum/check-answer', 'Front\CustomerController@checkAns')->name('customer.my_course.curriculum.check_ans');
            // store quiz's score route
            Route::post('/my-course/curriculum/store-quiz-score', 'Front\CustomerController@storeQuizScore')->name('customer.my_course.curriculum.store_quiz_score');
            // lesson-content completion route
            Route::post('/my-course/curriculum/content-completion', 'Front\CustomerController@contentCompletion')->name('customer.my_course.curriculum.content_completion');
            // get course certificate route
            Route::get('/my-course/{id}/get-certificate', 'Front\CustomerController@getCertificate')
                ->name('customer.my_course.get_certificate');
            // ->middleware(['certificate.status', 'routeAccess:Course Completion Certificate']);
            // purchase history route
            Route::get('/purchase-history', 'Front\CustomerController@purchaseHistory')->name('customer.purchase_history');
        });
    });

    Route::group(['middleware' => ['routeAccess:Portfolio']], function () {
        Route::get('/portfolios', 'Front\FrontendController@userPortfolios')->name('front.user.portfolios');
        Route::get('/portfolio/{slug}/{id}', 'Front\FrontendController@userPortfolioDetail')->name('front.user.portfolio.detail');
    });
    Route::group(['middleware' => ['routeAccess:Career']], function () {
        Route::get('/career', 'Front\FrontendController@userJobs')->name('front.user.jobs');
        Route::get('/job/{slug}/{id}', 'Front\FrontendController@userJobDetail')->name('front.user.job.detail');
    });
    Route::post('/subscribe', 'User\SubscriberController@store')->name('front.user.subscriber');
    Route::get('/contact', 'Front\CustomerController@contact')->name('front.user.contact');
    Route::post('/contact/message', 'Front\FrontendController@contactMessage')->name('front.contact.message')->middleware('Demo');
    Route::group(['middleware' => ['routeAccess:Team']], function () {
        Route::get('/team', 'Front\FrontendController@userTeam')->name('front.user.team');
    });
    Route::get('/faqs', 'Front\FrontendController@userFaqs')->name('front.user.faq');
    // Ecommerce route
    Route::group(['middleware' => ['routeAccess:Ecommerce']], function () {
        Route::get('/shop', 'Front\ShopController@shop')->name('front.user.shop');
        Route::get('/item/{slug}', 'Front\ShopController@adDetails')->name('front.user.item_details');
        Route::post('product/review/submit', 'Front\ReviewController@reviewsubmit')->name('item.review.submit')->middleware('Demo');
        Route::get('/add-to-cart/{id}', 'Front\ItemController@addToCart')->name('front.user.add.cart');
        Route::get('/add-to-wishlist/{id}', 'Front\ItemController@addToWishlist')->name('front.user.add.wishlist');
        Route::get('/cart', 'Front\ItemController@cart')->name('front.user.cart');
        Route::get('/cart/item/remove/{uid}', 'Front\ItemController@cartitemremove')->name('front.cart.item.remove');
        Route::post('/cart/update', 'Front\ItemController@updatecart')->name('front.user.cart.update');
        Route::get('/customer-checkout', 'Front\ItemController@checkout')->name('front.user.checkout');
        Route::post('/coupon', 'Front\ItemController@coupon')->name('front.coupon');
        Route::get('/customer-success', 'Front\CustomerController@onlineSuccess')->name('customer.success.page');
        // CHECKOUT SECTION
        Route::get('/product/payment/return', 'Payment\product\PaymentController@payreturn')->name('product.payment.return');
        Route::get('/product/payment/cancle', 'Payment\product\PaymentController@paycancle')->name('product.payment.cancle');
        Route::get('/product/paypal/notify', 'Payment\product\PaypalController@notify')->name('product.paypal.notify');
        Route::post('/item/payment/submit', 'Front\UsercheckoutController@checkout')->name('item.payment.submit')->middleware('Demo');
        // paypal routes
        Route::post('/product/paypal/submit', 'Payment\product\PaypalController@store')->name('product.paypal.submit');
        // stripe routes
        Route::post('/product/stripe/submit', 'Payment\product\StripeController@store')->name('product.stripe.submit');
        Route::post('/product/offline/{gatewayid}/submit', 'Payment\product\OfflineController@store')->name('product.offline.submit');
        //Flutterwave Routes
        Route::post('/product/flutterwave/submit', 'Payment\product\FlutterWaveController@store')->name('product.flutterwave.submit');
        Route::post('/product/flutterwave/notify', 'Payment\product\FlutterWaveController@notify')->name('product.flutterwave.notify');
        Route::get('/product/flutterwave/notify', 'Payment\product\FlutterWaveController@success')->name('product.flutterwave.success');
        //Paystack Routes
        Route::post('/product/paystack/submit', 'Payment\product\PaystackController@store')->name('product.paystack.submit');
        // RazorPay
        Route::post('/product/razorpay/submit', 'Payment\product\RazorpayController@store')->name('product.razorpay.submit');
        Route::post('/product/razorpay/notify', 'Payment\product\RazorpayController@notify')->name('product.razorpay.notify');
        //Instamojo Routes
        Route::post('/product/instamojo/submit', 'Payment\product\InstamojoController@store')->name('product.instamojo.submit');
        Route::get('/product/instamojo/notify', 'Payment\product\InstamojoController@notify')->name('product.instamojo.notify');
        //PayTM Routes
        Route::post('/product/paytm/submit', 'Payment\product\PaytmController@store')->name('product.paytm.submit');
        Route::post('/product/paytm/notify', 'Payment\product\PaytmController@notify')->name('product.paytm.notify');
        //Mollie Routes
        Route::post('/product/mollie/submit', 'Payment\product\MollieController@store')->name('product.mollie.submit');
        Route::get('/product/mollie/notify', 'Payment\product\MollieController@notify')->name('product.mollie.notify');
        // Mercado Pago
        Route::post('/product/mercadopago/submit', 'Payment\product\MercadopagoController@store')->name('product.mercadopago.submit');
        Route::post('/product/mercadopago/notify', 'Payment\product\MercadopagoController@notify')->name('product.mercadopago.notify');
        // PayUmoney
        Route::post('/product/payumoney/submit', 'Payment\product\PayumoneyController@store')->name('product.payumoney.submit');
        Route::post('/product/payumoney/notify', 'Payment\product\PayumoneyController@notify')->name('product.payumoney.notify');
        // CHECKOUT SECTION ENDS
        Route::post('/payment/instructions', 'Front\CustomerController@paymentInstruction')->name('user.front.payment.instructions');
    });

    Route::group(['middleware' => ['routeAccess:Request a Quote', 'Demo']], function () {
        Route::get('/quote', 'Front\FrontendController@quote')->name('front.user.quote');
        Route::post('/sendquote', 'Front\FrontendController@sendquote')->name('front.user.sendquote');
    });
    Route::prefix('item-checkout')->group(function () {
        Route::get('paypal/success', "User\Payment\PaypalController@successPayment")->name('customer.itemcheckout.paypal.success');
        Route::get('paypal/cancel', "User\Payment\PaypalController@cancelPayment")->name('customer.itemcheckout.paypal.cancel');
        Route::get('stripe/cancel', "User\Payment\StripeController@cancelPayment")->name('customer.itemcheckout.stripe.cancel');
        Route::get('paystack/success', 'User\Payment\PaystackController@successPayment')->name('customer.itemcheckout.paystack.success');
        Route::post('mercadopago/cancel', 'User\Payment\paymenMercadopagoController@cancelPayment')->name('customer.itemcheckout.mercadopago.cancel');
        Route::post('mercadopago/success', 'User\Payment\MercadopagoController@successPayment')->name('customer.itemcheckout.mercadopago.success');
        Route::post('razorpay/success', 'User\Payment\RazorpayController@successPayment')->name('customer.itemcheckout.razorpay.success');
        Route::post('razorpay/cancel', 'User\Payment\RazorpayController@cancelPayment')->name('customer.itemcheckout.razorpay.cancel');
        Route::get('instamojo/success', 'User\Payment\InstamojoController@successPayment')->name('customer.itemcheckout.instamojo.success');
        Route::post('instamojo/cancel', 'User\Payment\InstamojoController@cancelPayment')->name('customer.itemcheckout.instamojo.cancel');
        Route::post('flutterwave/success', 'User\Payment\FlutterWaveController@successPayment')->name('customer.itemcheckout.flutterwave.success');
        Route::post('flutterwave/cancel', 'User\Payment\FlutterWaveController@cancelPayment')->name('customer.itemcheckout.flutterwave.cancel');

        Route::get('/mollie/success', 'User\Payment\MollieController@successPayment')->name('customer.itemcheckout.mollie.success');
        Route::post('mollie/cancel', 'User\Payment\MollieController@cancelPayment')->name('customer.itemcheckout.mollie.cancel');

        Route::get('/phonepe/success', 'User\Payment\PhonePeController@successPayment')->name('customer.itemcheckout.phonepe.success');
        Route::get('phonepe/cancel', 'User\Payment\PhonePeController@cancelPayment')->name('customer.itemcheckout.phonepe.cancel');

        Route::get('/perfect_money/success', 'User\Payment\PerfectMoneyController@successPayment')->name('customer.itemcheckout.perfect_money.success');
        Route::get('perfect_money/cancel', 'User\Payment\PerfectMoneyController@cancelPayment')->name('customer.itemcheckout.perfect_money.cancel');

        Route::get('/xendit/success', 'User\Payment\XenditController@successPayment')->name('customer.itemcheckout.xendit.success');
        Route::get('/yoco/success', 'User\Payment\YocoController@successPayment')->name('customer.itemcheckout.yoco.success');
        Route::get('/toyyibpay/success', 'User\Payment\ToyyibpayController@successPayment')->name('customer.itemcheckout.toyyibpay.success');

        Route::post('/paytabs/success', 'User\Payment\PaytabsController@successPayment')->name('customer.itemcheckout.paytabs.success');
        Route::get('/midtrans/success', 'User\Payment\MidtransController@successPayment')->name('customer.itemcheckout.midtrans.success');
        Route::post('/iyzico/success', 'User\Payment\IyzicoController@successPayment')->name('customer.itemcheckout.iyzico.success');

        Route::get('anet/cancel', 'User\Payment\AuthorizenetController@cancelPayment')->name('customer.itemcheckout.anet.cancel');
        Route::get('/offline/success', 'Front\UsercheckoutController@offlineSuccess')->name('customer.itemcheckout.offline.success');
        Route::get('/trial/success', 'Front\CheckoutController@trialSuccess')->name('customer.itemcheckout.trial.success');
        Route::post('paytm/payment-status', "User\Payment\PaytmController@paymentStatus")->name('customer.itemcheckout.paytm.status');
    });
    Route::get('/vcard/{id}', 'Front\FrontendController@vcard')->name('front.user.vcard');
    Route::get('/vcard-import/{id}', 'Front\FrontendController@vcardImport')->name('front.user.vcardImport');
    Route::get('/user/changelanguage', 'Front\FrontendController@changeUserLanguage')->name('changeUserLanguage');
    Route::post('/user/change-language', 'Front\FrontendController@changeUserLanguage')->name('change.User.Language');
    // user logout attempt route
    Route::get('/logout',  'Front\CustomerController@logoutSubmit')->name('customer.logout');
    Route::group(['middleware' => ['routeAccess:Custom Page']], function () {
        Route::get('/{slug}', 'Front\FrontendController@userCPage')->name('front.user.cpage');
    });
});
