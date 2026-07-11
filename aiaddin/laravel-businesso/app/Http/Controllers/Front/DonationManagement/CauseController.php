<?php

namespace App\Http\Controllers\Front\DonationManagement;

use App\Http\Controllers\Controller;
use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CauseController extends Controller
{
    use MiscellaneousTrait;

    public function index(Request $request, $domain)
    {
        $user = getUser();
        $keyword = $category = null;
        if ($request->filled('search')) {
            $keyword = $request->search;
        }
        if ($request->filled('category')) {
            $category = DonationCategories::where('slug', $request['category'])->where('user_id', $user->id)->first()->id;
        }

        if ($request->filled('search')) {
            $keyword = $request['search'];
        }

        $currentLang = MiscellaneousTrait::getCustomerCurrentLanguage();
        $causes = Donation::query()
            ->where('user_donations.user_id', $user->id)
            ->join('user_donation_contents', 'user_donations.id', '=', 'user_donation_contents.donation_id')
            ->where('user_donation_contents.language_id', '=', $currentLang->id)
            ->join('user_donation_categories', 'user_donation_categories.id', '=', 'user_donation_contents.donation_category_id')
            ->when($category, function ($query, $category) {
                return $query->where('user_donation_contents.donation_category_id', '=', $category);
            })
            ->when($category, function ($query, $category) {
                return $query->where('user_donation_contents.donation_category_id', '=', $category);
            })
            ->when($keyword, function ($query, $keyword) {
                return $query->where('user_donation_contents.title', 'like', '%' . $keyword . '%');
            })
            ->select('user_donations.*', 'user_donation_contents.title', 'user_donation_contents.slug')
            ->latest()->paginate(10);


        $causes->map(function ($cause) use ($user, $currentLang) {
            $raised_amount = DonationDetail::query()
                ->where('donation_id', '=', $cause->id)
                ->where('status', '=', "completed")
                ->sum('amount');
            $goal_percentage = $raised_amount > 0 ? (($raised_amount / $cause->goal_amount) * 100) : 0;
            $cause['raised_amount'] = $raised_amount > 0 ? round($raised_amount, 2) : 0;
            $cause['goal_percentage'] = round($goal_percentage, 1);
        });

        $data['causes'] = $causes;

        $categories = DonationCategories::where([['language_id', $currentLang->id], ['user_id', $user->id]])->where('status', 1)->orderBy('serial_number')->get();
        $categories->map(function ($category) use ($currentLang) {
            $category['total'] = $category->donations()->where('language_id', $currentLang->id)->count();
        });
        $data['categories'] = $categories;

        $data['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);
        return view('user-front.donation_management.causes', $data);
    }

    public function details($domain, $slug)
    {
        $user = getUser();
        $currentLang = MiscellaneousTrait::getCustomerCurrentLanguage();
        $data['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);
        $cause =  DonationContent::where([['user_id', $user->id], ['language_id', $currentLang->id]])->where('slug', $slug)->first();


        $raised_amount = DonationDetail::query()
            ->where('donation_id', '=', $cause->donation_id)
            ->where('status', '=', "completed")
            ->sum('amount');
        $goal_percentage = $raised_amount > 0 ? (($raised_amount / $cause->donation->goal_amount) * 100) : 0;
        $cause['raised_amount'] = $raised_amount > 0 ? round($raised_amount, 2) : 0;
        $cause['goal_percentage'] = round($goal_percentage, 1);
        $data['causeContent'] = $cause;



        $data['onlineGateways'] = UserPaymentGeteway::query()
            ->where('user_id', $user->id)
            ->where('status', 1)
            ->get();

        $data['offlineGateways'] = UserOfflineGateway::query()
            ->where('user_id', $user->id)
            ->where('item_checkout_status', 1)
            ->orderBy('serial_number', 'ASC')
            ->get();

        $stripe = UserPaymentGeteway::where('keyword', 'stripe')->where([['status', 1], ['user_id', $user->id]])->first();
       
        if (is_null($stripe)) {
            $data['stripe_key'] = null;
        } else {
            $stripe_info = json_decode($stripe->information, true);
            $data['stripe_key'] = $stripe_info['key'];
        }

        return view('user-front.donation_management.cause_details', $data);
    }
}
