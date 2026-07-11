<?php

namespace App\Models\User;

use App\Models\BasicExtended;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\CourseManagement\CourseFaq;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Models\User\CourseManagement\Lesson;
use App\Models\User\CourseManagement\LessonContent;
use App\Models\User\CourseManagement\LessonQuiz;
use App\Models\User\CourseManagement\Module;
use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomCategory;
use App\Models\User\HotelBooking\RoomContent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Language extends Model
{
    public $table = "user_languages";

    protected $fillable = [
        'id',
        'name',
        'is_default',
        'dashboard_default',
        'code',
        'rtl',
        'user_id',
        'keywords'
    ];

    public function itemInfo()
    {
        return $this->hasMany(UserItemContent::class, 'language_id');
    }
    public function user_item_categories()
    {
        return $this->hasMany(UserItemCategory::class, 'language_id');
    }
    public function user_features()
    {
        return $this->hasMany(UserFeature::class, 'language_id');
    }
    public function user_item_subcategories()
    {
        return $this->hasMany(UserItemSubCategory::class, 'language_id');
    }

    public function user_offer_banners()
    {
        return $this->hasMany(UserOfferBanner::class, 'language_id');
    }

    public function user_shipping_charges()
    {
        return $this->hasMany(UserShippingCharge::class, 'language_id');
    }

    public function services()
    {
        return $this->hasMany('App\Models\User\UserService', 'lang_id');
    }

    public function variations()
    {
        return $this->hasMany('App\Models\User\UserItemVariation', 'language_id');
    }

    public function user_item_contacts()
    {
        return $this->hasMany('App\Models\User\UserItemContent', 'language_id');
    }

    public function contacts()
    {
        return $this->hasOne('App\Models\User\UserContact', 'language_id')->where('user_id', Auth::id());
    }


    public function quick_links()
    {
        return $this->hasMany('App\Models\User\FooterQuickLink', 'language_id')->where('user_id', Auth::id());
    }

    public function footer_texts()
    {
        return $this->hasMany('App\Models\User\FooterText', 'language_id')->where('user_id', Auth::id());
    }

    public function hero_static()
    {
        return $this->hasOne('App\Models\User\HeroStatic', 'language_id')->where('user_id', Auth::id());
    }

    public function hero_sliders()
    {
        return $this->hasMany('App\Models\User\HeroSlider', 'language_id')->where('user_id', Auth::id());
    }

    public function faqs()
    {
        return $this->hasMany('App\Models\User\FAQ', 'language_id')->where('user_id', Auth::id());
    }
    public function testimonials()
    {
        return $this->hasMany('App\Models\User\UserTestimonial', 'lang_id')->where('user_id', Auth::id());
    }
    public function blogs()
    {
        return $this->hasMany('App\Models\User\Blog')->where('user_id', Auth::id());
    }
    public function blog_categories()
    {
        return $this->hasMany('App\Models\User\BlogCategory')->where('user_id', Auth::id());
    }
    public function skills()
    {
        return $this->hasMany('App\Models\User\Skill')->where('user_id', Auth::id());
    }
    public function achievements()
    {
        return $this->hasMany('App\Models\User\CounterInformation')->where('user_id', Auth::id());
    }
    public function portfolios()
    {
        return $this->hasMany('App\Models\User\Portfolio')->where('user_id', Auth::id());
    }
    public function pages()
    {
        return $this->hasMany('App\Models\User\Page')->where('user_id', Auth::id());
    }
    public function menus()
    {
        return $this->hasMany('App\Models\User\Menu')->where('user_id', Auth::id());
    }
    public function portfolio_categories()
    {
        return $this->hasMany('App\Models\User\PortfolioCategory')->where('user_id', Auth::id());
    }
    public function seos()
    {
        return $this->hasMany('App\Models\User\SEO', 'language_id')->where('user_id', Auth::id());
    }
    public function jobs()
    {
        return $this->hasMany('App\Models\User\Job', 'language_id')->where('user_id', Auth::id());
    }
    public function jcategories()
    {
        return $this->hasMany('App\Models\User\Jcategory', 'language_id')->where('user_id', Auth::id());
    }
    public function home_page_texts()
    {
        return $this->hasMany('App\Models\User\HomePageText', 'language_id')->where('user_id', Auth::id());
    }
    public function processes()
    {
        return $this->hasMany('App\Models\User\WorkProcess', 'language_id')->where('user_id', Auth::id());
    }
    public function teams()
    {
        return $this->hasMany('App\Models\User\Member', 'language_id')->where('user_id', Auth::id());
    }
    public function quote_inputs()
    {
        return $this->hasMany('App\Models\User\QuoteInput', 'language_id')->where('user_id', Auth::id());
    }

    public function roomDetails()
    {
        return $this->hasMany(RoomContent::class, 'language_id', 'id')->where('user_id', Auth::id());
    }
    public function roomCategories()
    {
        return $this->hasMany(RoomCategory::class, 'language_id', 'id')->where('user_id', Auth::id());
    }
    public function roomAmenities()
    {
        return $this->hasMany(RoomAmenity::class, 'language_id', 'id')->where('user_id', Auth::id());
    }
    public function courseCategory()
    {
        return $this->hasMany(CourseCategory::class, 'language_id', 'id')->where('user_id', Auth::id());
    }
    public function courseFaqs()
    {
        return $this->hasMany(CourseFaq::class, 'language_id', 'id')->where('user_id', Auth::id());
    }
    public function courseInformation()
    {
        return $this->hasMany(CourseInformation::class, 'language_id', 'id')->where('user_id', Auth::id());
    }

    public function courseInstructtors()
    {
        return $this->hasMany(Instructor::class, 'language_id', 'id')->where('user_id', Auth::id());
    }

    public function courseLessons()
    {
        return $this->hasMany(Lesson::class, 'language_id', 'id')->where('user_id', Auth::id());
    }

    // public function courseLessonContents()
    // {
    //     return $this->hasMany(LessonContent::class, 'language_id', 'id')->where('user_id', Auth::id());
    // }

    // public function courseLessonQuiz()
    // {
    //     return $this->hasMany(LessonQuiz::class, 'language_id', 'id')->where('user_id', Auth::id());
    // }

    public function courseModules()
    {
        return $this->hasMany(Module::class, 'language_id', 'id')->where('user_id', Auth::id());
    }

    public function actionSection()
    {
        return $this->hasOne(ActionSection::class, 'language_id');
    }

    public function causeContent()
    {
        return $this->hasOne(DonationContent::class, 'language_id', 'id');
    }

    public function causeContents()
    {
        return $this->hasMany(DonationContent::class, 'language_id', 'id');
    }
    public function causeCategories()
    {
        return $this->hasMany(DonationCategories::class, 'language_id', 'id');
    }

    public function donationCategories()
    {
        return $this->hasMany(DonationCategories::class, 'language_id', 'id');
    }
}
