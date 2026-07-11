<?php

namespace App\Http\Controllers\Front\CourseManagement;

use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Coupon;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\CourseManagement\CourseReview;
use App\Models\User\Language;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CourseController extends Controller
{
    use MiscellaneousTrait;
    public function courses(Request $request, $domain)
    {
        $user = getUser();

        $language = $this->getUserCurrentLanguage($user->id);

        $type = $category = $min = $max = $keyword = $sort = null;

        if ($request->filled('type')) {
            $type = $request['type'];
        }
        if ($request->filled('category')) {
            $category = CourseCategory::where('slug', $request['category'])->where('user_id', $user->id)->first()->id;
        }
        if ($request->filled('min') && $request->filled('max')) {
            $min = $request['min'];
            $max = $request['max'];
        }
        if ($request->filled('keyword')) {
            $keyword = $request['keyword'];
        }
        if ($request->filled('sort')) {
            $sort = $request['sort'];
        }

        $courses = Course::query()->join('user_course_informations', 'user_courses.id', '=', 'user_course_informations.course_id')
            ->join('user_course_categories', 'user_course_categories.id', '=', 'user_course_informations.course_category_id')
            ->join('user_course_instructors', 'user_course_instructors.id', '=', 'user_course_informations.instructor_id')
            ->where('user_courses.status', '=', 'published')
            ->where('user_course_informations.language_id', '=', $language->id)
            ->where('user_course_informations.user_id', '=', $user->id)
            ->when($type, function ($query, $type) {
                if ($type == 'free') {
                    return $query->where('user_courses.pricing_type', '=', 'free');
                } else if ($type == 'premium') {
                    return $query->where('user_courses.pricing_type', '=', 'premium');
                }
            })
            ->when($category, function ($query, $category) {
                return $query->where('user_course_informations.course_category_id', '=', $category);
            })
            ->when(($min && $max), function ($query) use ($min, $max) {
                return $query->where('user_courses.current_price', '>=', $min)->where('user_courses.current_price', '<=', $max);
            })
            ->when($keyword, function ($query, $keyword) {
                return $query->where('user_course_informations.title', 'like', '%' . $keyword . '%');
            })
            ->select('user_courses.id', 'user_courses.thumbnail_image', 'user_courses.pricing_type', 'user_courses.previous_price', 'user_courses.current_price', 'user_courses.average_rating', 'user_courses.duration', 'user_course_informations.title', 'user_course_informations.slug', 'user_course_categories.name as categoryName', 'user_course_categories.slug as categorySlug', 'user_course_instructors.image as instructorImage', 'user_course_instructors.name as instructorName')
            ->when($sort, function ($query, $sort) {
                if ($sort == 'new') {
                    return $query->orderBy('user_courses.created_at', 'DESC');
                } else if ($sort == 'old') {
                    return $query->orderBy('user_courses.created_at', 'ASC');
                } elseif ($sort == 'ascending') {
                    return $query->orderBy('user_courses.current_price', 'ASC');
                } elseif ($sort == 'descending') {
                    return $query->orderBy('user_courses.current_price', 'DESC');
                }
            }, function ($query) {
                return $query->orderByDesc('user_courses.id');
            })
            ->paginate(9);

        $courses->map(function ($course) use ($user) {
            $course['enrolmentCount'] = CourseEnrolment::query()
                ->where('course_id', '=', $course->id)
                ->where('user_id', $user->id)
                ->where(function ($query) {
                    $query->where('payment_status', 'completed')
                        ->orWhere('payment_status', 'free');
                })
                ->count();
        });

        $queryResult['courses'] = $courses;
        $queryResult['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);

        $queryResult['categories'] = CourseCategory::query()->where('user_id', $user->id)->where('language_id', $language->id)->where('status', 1)->orderBy('serial_number', 'asc')->get();



        $queryResult['minPrice'] = Course::query()->where('pricing_type', 'premium')
            ->where('status', 'published')
            ->where('user_id', $user->id)
            ->min('current_price');


        $queryResult['maxPrice'] = Course::query()->where('pricing_type', 'premium')
            ->where('status', 'published')
            ->where('user_id', $user->id)
            ->max('current_price');

        if (empty($queryResult['minPrice'])) {
            $queryResult['minPrice'] = 0;
        }
        if (empty($queryResult['maxPrice'])) {
            $queryResult['maxPrice'] = 0;
        }

        return view('user-front.course_management.courses', $queryResult);
    }

    public function details($domain, $slug)
    {
        $user = getUser();

        $language = $this->getUserCurrentLanguage($user->id);
        $defaultLanguage = Language::where('is_default', 1)->where('user_id', $user->id)->first();

        $courseId = CourseInformation::where('slug', $slug)->where('user_id', $user->id)->firstOrFail()->course_id;
        
        $details = Course::query()->join('user_course_informations', 'user_courses.id', '=', 'user_course_informations.course_id')
            ->join('user_course_categories', 'user_course_categories.id', '=', 'user_course_informations.course_category_id')
            ->join('user_course_instructors', 'user_course_instructors.id', '=', 'user_course_informations.instructor_id')
            ->where('user_courses.status', '=', 'published')
            // ->where('user_course_informations.language_id', '=', $language->id)
            ->where(function ($query) use ($language, $defaultLanguage) {
                $query->where('user_course_informations.language_id', '=', $language->id)
                    ->orWhere('user_course_informations.language_id', '=', $defaultLanguage->id);
            })
            ->where('user_course_informations.course_id', '=', $courseId)
            ->where('user_courses.user_id', '=', $user->id)
            ->select('user_courses.*', 'user_course_informations.id as courseInfoId', 'user_course_informations.language_id', 'user_course_informations.title', 'user_course_informations.features', 'user_course_informations.description', 'user_course_informations.meta_keywords', 'user_course_informations.meta_description', 'user_course_categories.name as categoryName', 'user_course_instructors.id as instructorId', 'user_course_instructors.image as instructorImage', 'user_course_instructors.name as instructorName', 'user_course_instructors.occupation as instructorJob', 'user_course_instructors.description as instructorDetails')
            ->firstOrFail();

        if (empty($details)) {
            $deLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
            session()->put('currentLocaleCode', $deLang->code);
            app()->setLocale($deLang->code);
            $details = Course::join('course_informations', 'courses.id', '=', 'course_informations.course_id')
                ->join('course_categories', 'course_categories.id', '=', 'course_informations.course_category_id')
                ->join('instructors', 'instructors.id', '=', 'course_informations.instructor_id')
                ->where('courses.status', '=', 'published')
                ->where('user_course_informations.language_id', '=', $deLang->id)
                ->where('user_course_informations.course_id', '=', $courseId)
                ->where('user_courses.user_id', '=', $user->id)
                ->select('courses.*', 'course_informations.id as courseInfoId', 'course_informations.language_id', 'course_informations.title', 'course_informations.features', 'course_informations.description', 'course_informations.meta_keywords', 'course_informations.meta_description', 'course_categories.name as categoryName', 'instructors.id as instructorId', 'instructors.image as instructorImage', 'instructors.name as instructorName', 'instructors.occupation as instructorJob', 'instructors.description as instructorDetails')
                ->firstOrFail();
        }

        $queryResult['details'] = $details;

        $queryResult['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);

        $queryResult['onlineGateways'] = UserPaymentGeteway::query()
            ->where('user_id', $user->id)
            ->where('status', 1)
            ->get();

        $queryResult['offlineGateways'] = UserOfflineGateway::query()
            ->where('user_id', $user->id)
            ->where('item_checkout_status', 1)
            ->orderBy('serial_number', 'ASC')
            ->get();

        $categoryId = CourseInformation::query()->where('language_id', $language->id)
            ->where('user_id', $user->id)
            ->where('slug', $slug)
            ->pluck('course_category_id')
            ->first();

        $relatedCourses = Course::query()->join('user_course_informations', 'user_courses.id', '=', 'user_course_informations.course_id')
            ->join('user_course_categories', 'user_course_categories.id', '=', 'user_course_informations.course_category_id')
            ->join('user_course_instructors', 'user_course_instructors.id', '=', 'user_course_informations.instructor_id')
            ->where('user_courses.status', '=', 'published')
            ->where('user_course_informations.language_id', '=', $language->id)
            ->where('user_course_informations.course_category_id', '=', $categoryId)
            ->where('user_course_informations.course_id', '<>', $courseId)
            ->where('user_courses.user_id', '=', $user->id)
            ->select('user_courses.id', 'user_courses.thumbnail_image', 'user_courses.pricing_type', 'user_courses.previous_price', 'user_courses.current_price', 'user_courses.average_rating', 'user_courses.duration', 'user_course_informations.title', 'user_course_informations.slug', 'user_course_categories.name as categoryName', 'user_course_instructors.image as instructorImage', 'user_course_instructors.name as instructorName', 'user_course_categories.slug as categorySlug')
            ->orderByDesc('user_courses.id')
            ->limit(2)
            ->get();

        $relatedCourses->map(function ($relatedCourse) use ($user) {
            $relatedCourse['enrolmentCount'] = CourseEnrolment::query()
                ->where('course_id', '=', $relatedCourse->id)
                ->where('user_id', $user->id)
                ->where(function ($query) {
                    $query->where('payment_status', '!=', 'pending')
                        ->where('payment_status', '!=', 'rejected');
                })
                ->count();
        });

        $queryResult['relatedCourses'] = $relatedCourses;

        $course = $queryResult['details'];

        $queryResult['reviews'] = CourseReview::query()
            ->where('course_id', $course->id)
            ->orderByDesc('id')
            ->get();

        //it will be replaced by student id
        if (Auth::guard('customer')->check()) {
            $authUser = Auth::guard('customer')->user();
            $queryResult['enrolmentInfo'] = CourseEnrolment::query()
                ->where('customer_id', $authUser->id)
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->first();
        }

        $queryResult['ratingCount'] = CourseReview::query()->where('course_id', $course->id)->count();

        $queryResult['enrolmentCount'] = CourseEnrolment::query()
            ->where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->where(function ($query) {
                $query->where('payment_status', '!=', 'pending')
                    ->where('payment_status', '!=', 'rejected');
            })
            ->count();
        $stripe = UserPaymentGeteway::where('keyword', 'stripe')->where([['status', 1], ['user_id', $user->id]])->first();
        if (is_null($stripe)) {
            $queryResult['stripe_key'] = null;
        } else {
            $stripe_info = json_decode($stripe->information, true);
            $queryResult['stripe_key'] = $stripe_info['key'];
        }

        $queryResult['currentLanguageInfo'] = $language;
        return view('user-front.course_management.course-details', $queryResult);
    }

    public function applyCoupon(Request $request, $domain)
    {
        $user = getUser();
        $keywords = getUserKeywords();
        try {
            $coupon = Coupon::query()->where('code', $request->coupon)->where('user_id', $user->id)->firstOrFail();

            $startDate = Carbon::parse($coupon->start_date);
            $endDate = Carbon::parse($coupon->end_date);
            $todayDate = Carbon::now();

            $courses = $coupon->courses;
            $courses = json_decode($courses, true);
            $courses = !empty($courses) ? $courses : [];

            if (!in_array($request->id, $courses)) {
                $message = $keywords['This_coupon_is_not_valid_for_this_course'] ?? __('Coupon is not valid for this course') . '!';
                return response()->json([
                    'error' => $message
                ]);
            }

            // first, check coupon is valid or not
            if ($todayDate->between($startDate, $endDate) == false) {
                $message = $keywords['coupon_not_valid'] ?? __('Coupon is not valid') . '!';
                return response()->json(['error' => $message]);
            } else {
                $messsage = $keywords['coupon_applied_success'] ?? __('Coupon applied successfully') . '.';
                $course = Course::query()->where('user_id', $user->id)->findOrFail($request->id);
                $coursePrice = floatval($course->current_price);

                if ($coupon->type == 'fixed') {
                    $reducedPrice = $coursePrice - floatval($coupon->value);

                    $request->session()->put('discountedCourse', $course->id);
                    $request->session()->put('discount', $coupon->value);
                    $request->session()->put('discountedPrice', $reducedPrice);

                    return response()->json([
                        'success' => $messsage,
                        'amount' => $coupon->value,
                        'newPrice' => $reducedPrice
                    ]);
                } else {
                    $couponAmount = $coursePrice * ($coupon->value / 100);
                    $couponAmount = round($couponAmount, 2);
                    $reducedPrice = $coursePrice - $couponAmount;

                    $request->session()->put('discountedCourse', $course->id);
                    $request->session()->put('discount', $couponAmount);
                    $request->session()->put('discountedPrice', $reducedPrice);

                    return response()->json([
                        'success' => $messsage,
                        'amount' => $couponAmount,
                        'newPrice' => $reducedPrice
                    ]);
                }
            }
        } catch (ModelNotFoundException $e) {
            $message = $keywords['coupon_not_valid'] ?? __('Coupon is not valid') . '.';
            return response()->json(['error' => $message]);
        }
    }

    public function storeFeedback(Request $request, $domain, $id)
    {
        $rule = ['rating' => 'required'];
        $validator = Validator::make($request->all(), $rule);
        if ($validator->fails()) {
            return redirect()->back()->with('error', 'The rating field is required for course review.')->withInput();
        }
        $flag = 0;
        $user = getUser();
        // get to authenticate user
        $customer = Auth::guard('customer')->user();

        // then, get the course enrolments of that user
        $enrolments = $customer->courseEnrolment()
            ->where(function ($query) {
                $query->where('payment_status', '!=', 'pending')
                    ->where('payment_status', '!=', 'rejected');
            })
            ->get();

        if (count($enrolments) > 0) {
            foreach ($enrolments as $enrolment) {
                // check whether selected course has enrolled to this user or not
                if ($enrolment->course_id == $id) {
                    $flag = 1;
                    break;
                }
            }

            if ($flag == 1) {
                CourseReview::updateOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'course_id' => $id,
                        'user_id' => $user->id
                    ],
                    [
                        'comment' => $request->comment,
                        'rating' => $request->rating,
                        'user_id' => $user->id
                    ]
                );

                // now, get the average rating of this course
                $reviews = CourseReview::query()
                    ->where('course_id', $id)
                    ->where('user_id', $user->id)
                    ->get();

                $totalRating = 0;

                foreach ($reviews as $review) {
                    $totalRating += $review->rating;
                }

                $averageRating = $totalRating / $reviews->count();

                // finally, store the average rating of this course
                Course::query()->where('user_id', $user->id)->find($id)->update(['average_rating' => $averageRating]);

                session()->flash('success', 'Your review submitted successfully.');
            } else {
                session()->flash('error', 'You have not enrolled in this course yet!');
            }
        } else {
            return redirect()->back()->with('error', 'You have not enrolled in any course yet!');
        }

        return redirect()->back();
    }
}
