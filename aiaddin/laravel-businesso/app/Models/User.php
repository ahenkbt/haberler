<?php

namespace App\Models;

use App\Models\User\Brand;
use App\Models\User\Member;
use App\Notifications\UserResetPassword;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Coupon as CourseManagementCoupon;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Models\User\CourseManagement\LessonComplete;
use App\Models\User\CourseManagement\LessonContentComplete;
use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\Education;
use App\Models\User\HotelBooking\Coupon;
use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\HotelBooking\RoomCategory;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\HotelBooking\RoomReview;
use App\Models\User\JobExperience;
use App\Models\User\UserCoupon;
use App\Models\User\UserFeature;
use App\Models\User\UserItem;
use App\Models\User\UserItemCategory;
use App\Models\User\UserItemSubCategory;
use App\Models\User\UserOfferBanner;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserOrder;
use App\Models\User\UserPaymentGeteway;
use App\Models\User\UserShippingCharge;
use App\Models\User\UserShopSetting;
use App\Models\User\UserVcard;
use App\Models\User\WorkProcess;

class User extends Authenticatable
{
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'photo',
        'username',
        'password',
        'phone',
        'company_name',
        'city',
        'state',
        'address',
        'country',
        'status',
        'featured',
        'verification_link',
        'email_verified',
        'template_name',
        'show_home'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'remember_token',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function user_custom_domains()
    {
        return $this->hasMany('App\Models\User\UserCustomDomain', 'user_id');
    }

    public function custom_domains()
    {
        return $this->hasMany('App\Models\User\UserCustomDomain');
    }

    public function memberships()
    {
        return $this->hasMany('App\Models\Membership', 'user_id');
    }

    public function permissions()
    {
        return $this->hasOne('App\Models\User\UserPermission', 'user_id');
    }

    public function basic_setting()
    {
        return $this->hasOne('App\Models\User\BasicSetting', 'user_id');
    }

    public function portfolios()
    {
        return $this->hasMany('App\Models\User\Portfolio', 'user_id');
    }

    public function portfolioCategories()
    {
        return $this->hasMany('App\Models\User\PortfolioCategory', 'user_id');
    }

    public function skills()
    {
        return $this->hasMany('App\Models\User\Skill', 'user_id');
    }

    public function qr_codes()
    {
        return $this->hasMany('App\Models\User\UserQrCode', 'user_id');
    }

    public function counterInformations()
    {
        return $this->hasMany('App\Models\User\CounterInformation', 'user_id');
    }

    public function services()
    {
        return $this->hasMany('App\Models\User\UserService', 'user_id');
    }

    public function faqs()
    {
        return $this->hasMany('App\Models\User\FAQ', 'user_id');
    }

    public function seos()
    {
        return $this->hasMany('App\Models\User\SEO', 'user_id');
    }

    public function testimonials()
    {
        return $this->hasMany('App\Models\User\UserTestimonial', 'user_id');
    }

    public function blogs()
    {
        return $this->hasMany('App\Models\User\Blog', 'user_id');
    }

    public function blog_categories()
    {
        return $this->hasMany('App\Models\User\BlogCategory', 'user_id');
    }

    public function jcategories()
    {
        return $this->hasMany('App\Models\User\Jcategory', 'user_id');
    }

    public function jobs()
    {
        return $this->hasMany('App\Models\User\Job', 'user_id');
    }

    public function social_media()
    {
        return $this->hasMany('App\Models\User\Social', 'user_id');
    }

    public function permission()
    {
        return $this->hasOne('App\Models\User\UserPermission', 'user_id');
    }

    public function languages()
    {
        return $this->hasMany('App\Models\User\Language', 'user_id');
    }

    public function home_page_texts()
    {
        return $this->hasMany('App\Models\User\HomePageText', 'user_id');
    }

    public function footer_quick_links()
    {
        return $this->hasMany('App\Models\User\FooterQuickLink', 'user_id');
    }

    public function quotes()
    {
        return $this->hasMany('App\Models\User\Quote', 'user_id');
    }

    public function subscribers()
    {
        return $this->hasMany('App\Models\User\Subscriber', 'user_id');
    }

    public function quote_inputs()
    {
        return $this->hasMany('App\Models\User\QuoteInput', 'user_id');
    }

    public function hero_sliders()
    {
        return $this->hasMany('App\Models\User\HeroSlider', 'user_id');
    }

    public function hero_static()
    {
        return $this->hasOne('App\Models\User\HeroStatic', 'user_id');
    }

    public function footer_texts()
    {
        return $this->hasMany('App\Models\User\FooterText', 'user_id');
    }
    public function teams()
    {
        return $this->hasMany(Member::class, 'user_id');
    }
    public function processes()
    {
        return $this->hasMany(WorkProcess::class, 'user_id');
    }
    public function achievements()
    {
        return $this->hasMany('App\Models\User\CounterInformation', 'user_id');
    }
    public function vcards()
    {
        return $this->hasMany(UserVcard::class, 'user_id');
    }
    public function brands()
    {
        return $this->hasMany(Brand::class, 'user_id');
    }
    public function menus()
    {
        return $this->hasMany('App\Models\User\Menu', 'user_id');
    }
    public function pages()
    {
        return $this->hasMany('App\Models\User\Page', 'user_id');
    }
    public function templates()
    {
        return $this->hasMany('App\Models\User\UserEmailTemplate', 'user_id');
    }
    public function user_contact()
    {
        return $this->hasOne('App\Models\User\UserContact', 'user_id');
    }
    public function home_section()
    {
        return $this->hasOne('App\Models\User\HomeSection', 'user_id');
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $username = User::query()->where('email', request()->email)->pluck('username')->first();
        $subject = 'You are receiving this email because we received a password reset request for your account.';
        $body = "Recently you tried forget password for your account.Click below to reset your account password.
             <br>
             <a href='" . url('password/reset/' . $token . '/email/' . request()->email) . "'><button type='button' class='btn btn-primary'>Reset Password</button></a>
             <br>
             Thank you.
             ";
        $controller = new Controller();
        $controller->resetPasswordMail(request()->email, $username, $subject, $body);
        session()->flash('success', "we sent you an email. Please check your inbox");
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'user_id');
    }
    public function user_coupons()
    {
        return $this->hasMany(UserCoupon::class, 'user_id');
    }
    public function user_features()
    {
        return $this->hasMany(UserFeature::class, 'user_id');
    }
    public function user_items()
    {
        return $this->hasMany(UserItem::class, 'user_id');
    }
    public function user_item_categories()
    {
        return $this->hasMany(UserItemCategory::class, 'user_id');
    }
    public function user_item_subcategories()
    {
        return $this->hasMany(UserItemSubCategory::class, 'user_id');
    }
    public function user_offer_banners()
    {
        return $this->hasMany(UserOfferBanner::class, 'user_id');
    }
    public function user_offline_gateways()
    {
        return $this->hasMany(UserOfflineGateway::class, 'user_id');
    }
    public function user_orders()
    {
        return $this->hasMany(UserOrder::class, 'user_id');
    }
    public function user_payment_gateways()
    {
        return $this->hasMany(UserPaymentGeteway::class, 'user_id');
    }
    public function user_shipping_charges()
    {
        return $this->hasMany(UserShippingCharge::class, 'user_id');
    }
    public function user_shop_settings()
    {
        return $this->hasOne(UserShopSetting::class, 'user_id');
    }

    public function rooms()
    {
        return $this->hasMany(Room::class, 'user_id', 'id');
    }

    public function roomContents()
    {
        return $this->hasMany(RoomContent::class, 'user_id', 'id');
    }

    public function roomCategories()
    {
        return $this->hasMany(RoomCategory::class, 'user_id', 'id');
    }

    public function roomCoupns()
    {
        return $this->hasMany(Coupon::class, 'user_id', 'id');
    }

    public function roomAmenities()
    {
        return $this->hasMany(RoomAmenity::class, 'user_id', 'id');
    }

    public function rommReviews()
    {
        return $this->hasMany(RoomReview::class, 'user_id', 'id');
    }
    public function roomReviews()
    {
        return $this->hasMany(RoomReview::class, 'user_id');
    }

    public function roomBookings()
    {
        return $this->hasmany(RoomBooking::class, 'user_id', 'id');
    }

    public function courses()
    {
        return $this->hasMany(Course::class, 'user_id', 'id');
    }
    public function job_experiences()
    {
        return $this->hasMany(JobExperience::class, 'user_id');
    }

    public function educations()
    {
        return $this->hasMany(Education::class, 'user_id');
    }

    public function causes()
    {
        return $this->hasMany(Donation::class, 'user_id');
    }
    public function causeCategories()
    {
        return $this->hasMany(DonationCategories::class, 'user_id');
    }

    public function causesContent()
    {
        return $this->hasMany(DonationContent::class, 'user_id');
    }
    public function donationDetails()
    {
        return $this->hasMany(DonationDetail::class, 'user_id');
    }
    public function courseCategory()
    {
        return $this->hasMany(CourseCategory::class, 'user_id', 'id');
    }
    public function courseInstructtors()
    {
        return $this->hasMany(Instructor::class, 'user_id', 'id');
    }

    public function courseCoupon()
    {
        return $this->hasMany(CourseManagementCoupon::class, 'user_id', 'id');
    }

    public function lessonComplete()
    {
        return $this->hasMany(LessonComplete::class, 'user_id', 'id');
    }

    public function lessonContentComplete()
    {
        return $this->hasMany(LessonContentComplete::class, 'user_id', 'id');
    }
}
