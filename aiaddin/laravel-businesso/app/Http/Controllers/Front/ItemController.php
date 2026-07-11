<?php

namespace App\Http\Controllers\Front;

use Academe\AuthorizeNet\Request\Model\Customer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\UserItem;
use App\Models\User\UserCoupon;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Models\User\UserItemContent;
use App\Models\User\UserShopSetting;
use Illuminate\Support\Facades\Auth;
use App\Models\User\CustomerWishList;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use App\Models\User\UserShippingCharge;
use Illuminate\Support\Facades\Session;

class ItemController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:customer')->except('addToCart', 'cart', 'addToWishlist', 'cartitemremove', 'updatecart', 'checkout');
    }
    public function addToCart($domain, $id)
    {
        $keywords = getUserKeywords();
        $user = getUser();
        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
        }
        $cart = Session::get('cart');
        // $cart = Session::forget('cart');
        // $cart = Session::put('cart', null);
        $data = explode(',,,', $id);
        $id = (int)$data[0];
        $qty = (int)$data[1];
        $total = (float)$data[2];
        $product_price = (float)$data[4];
        $variant = json_decode($data[3], true);
        $item = UserItem::findOrFail($id);
        // validations
        $item_content =  UserItemContent::where('item_id', $id)->where('language_id', $userCurrentLang->id)->first();
        if ($qty < 1) {
            return response()->json(['error' => $keywords['quantity_min_error'] ?? __('Quantity should be minimum 1') . '.']);
        }

        $pvariant = $item->itemVariations()->where('language_id', $userCurrentLang->id)->get();
        if (count($pvariant) == 0) {
            $stock = false;
        } else {
            $stock = true;
        }

        if ($item->type == 'physical' && $stock == false && empty($item->stock)) {
            return response()->json(['error' => $keywords['stock_out_error'] ?? __('Stock Out') . '.']);
        }

        if (count($pvariant) > 0 && (count($variant) != count($pvariant))) {
            return response()->json(['error' => $keywords['variation_empty_error'] ?? __('You can not leave any variation empty. Please Select variation') . '.']);
        }

        if (!$item) {
            abort(404);
        }

        $ckey = uniqid();

        $successMessage = $keywords['cart_add_success'] ?? __('Item added to cart successfully!') . '.';
        // if cart is empty then this the first product
        if (empty($cart)) {
            $cart = [
                $ckey => [
                    "id" => $id,
                    "name" => $item_content->title,
                    "qty" => (int)$qty,
                    "variations" => $variant,
                    "product_price" => $product_price,
                    "original_price" => (float)$item->current_price,
                    "total" => $total,
                    "slug" => $item_content->slug
                ]
            ];
            Session::put('cart', $cart);
            return response()->json(['message' => $successMessage]);
        }

        // if cart not empty then check if this product (with same variation) exist then increment quantity
        foreach ($cart as $key => $cartItem) {
            if ($cartItem["id"] == $id && $variant == $cartItem["variations"]) {
                $cart[$key]['qty'] = (int)$cart[$key]['qty'] + $qty;
                $cart[$key]['total'] = (float)$cart[$key]['total'] + $total;
                Session::put('cart', $cart);
                return response()->json(['message' => $successMessage]);
            }
        }


        // if item not exist in cart then add to cart with quantity = 1
        $cart[$ckey] = [
            "id" => $id,
            "name" => $item_content->title,
            "qty" => (int)$qty,
            "variations" => $variant,
            "product_price" => $product_price,
            "original_price" => (float)$item->current_price,
            "total" => $total,
            "slug" => $item_content->slug
        ];
        Session::put('cart', $cart);
        return response()->json(['message' => $successMessage]);
    }


    public function addToWishlist($domain, $id)
    {
 
        $keywords = getUserKeywords();
      
        if (!Auth::guard('customer')->check()) {
            return response()->json(['error' => $keywords['please_login_first'] ?? __('Please login first!')]);
        }
        $user = getUser();

        $wishlist = CustomerWishList::where('customer_id', Auth::guard('customer')->user()->id)->where('item_id', $id)->first();
        $data = explode(',,,', $id);
        $id = (int)$data[0];

        // if wishlist is empty then this the first Item for this user
        if (!$wishlist) {
            CustomerWishList::create([
                'customer_id' => Auth::guard('customer')->user()->id,
                'item_id' => $id,
            ]);

            return response()->json(['message' => $keywords['item_added_to_wishlist'] ?? __('Item added to wishlist successfully')]);
        } else {
            $wishlist->delete();
            return response()->json(['message' => $keywords['item_removed_from_wishlist'] ?? __('Item removed from wishlist successfully')]);
        }
    }
    public function cart($domain)
    {
        $user = getUser();
        $userShop = UserShopSetting::where('user_id', $user->id)->first();
        if (!empty($userShop) && ($userShop->is_shop == 0 || $userShop->catalog_mode == 1)) {
            return redirect()->route('front.user.detail.view', getParam());
        }
        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
        }
        if (Session::has('cart')) {
            $data['cart'] = Session::get('cart');
        } else {
            $data['cart'] = null;
        }
        $userBs = BasicSetting::where('user_id', $user->id)->first();
        $version = $userBs->theme_version;
        if ($version == 'dark') {
            $version = 'default';
        }
        $data['version'] = $version;
        return view('user-front.cart', $data);
    }
    public function cartitemremove($doamin, $uid)
    {
        if ($uid) {
            $keywords = getUserKeywords();
            $cart = Session::get('cart');
            if (isset($cart[$uid])) {
                unset($cart[$uid]);
                Session::put('cart', $cart);
            }
            $total = 0;
            $count = 0;
            foreach ($cart as $i) {
                $total += $i['product_price'] * $i['qty'];
                $count += $i['qty'];
            }
            $total = round($total, 2);

            $message = $keywords['item_removed_successfully'] ?? __('Item removed successfully.') . '.';

            return response()->json([
                'message' => $message,
                'count' => $count,
                'total' => $total
            ]);
        }
    }
    public function updatecart(Request $request)
    {

        $keywords = getUserKeywords();

        $cart = Session::get('cart');
        $qtys = $request->qty;
        $i = 0;

        foreach ($cart as $cartKey => $cartItem) {
            $total = 0;

            $cart[$cartKey]["qty"] = (int)$qtys[$i];
            // calculate total

            if (is_array($cartItem["variations"])) {
                foreach ($cartItem["variations"] as $key => $variant) {
                    $total +=  (float)$variant["price"];
                }
            }

            $total += (float)$cartItem["product_price"];

            $total = $total * $qtys[$i];
            // save total in the cart item
            $cart[$cartKey]["total"] = $total;
            $i++;
        }

        Session::put('cart', $cart);

        $message = $keywords['cart_update_success'] ?? __('Cart updated successfully.') . '.';

        return response()->json(['message' => $message]);
    }
    public function checkout($doamin, Request $request)
    {
        $keywords = getUserKeywords();
        $user = getUser();
        $userShop = UserShopSetting::where('user_id', $user->id)->first();
        if (!empty($userShop) && ($userShop->is_shop == 0 || $userShop->catalog_mode == 1)) {
            return redirect()->route('front.user.detail.view', getParam());
        }
        if (!Auth::guard('customer')->check()) {
            Session::put('link', route('front.user.checkout', getParam()));
            return redirect(route('customer.login', getParam(), ['redirected' => 'checkout']));
        }
        if (!Session::get('cart')) {

            $errorMessage = $keywords['cart_empty_error'] ?? __('Your cart is empty.') . '.';
            Session::flash('error', $errorMessage);

            return back();
        }
        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->first();
        }
        if (Session::has('cart')) {
            $data['cart'] = Session::get('cart');
        } else {
            $data['cart'] = null;
        }
        $data['shippings'] = UserShippingCharge::where('user_id', $user->id)->where('language_id', $userCurrentLang->id)->get();
        $data['offlines'] = UserOfflineGateway::where('user_id', $user->id)->where('item_checkout_status', 1)->where('user_id', $user->id)->get();
        $data['payment_gateways'] = UserPaymentGeteway::where('user_id', $user->id)->where('status', 1)->get();
        $data['discount'] = session()->has('user_coupon') && !empty(session()->get('user_coupon')) ? session()->get('user_coupon') : 0;
        // determining the theme version selected
        $userBs = BasicSetting::where('user_id', $user->id)->first();
        $version = $userBs->theme_version;
        if ($version == 'dark') {
            $version = 'default';
        }
        $data['version'] = $version;
        $stripe = UserPaymentGeteway::where('keyword', 'stripe')->where([['status', 1], ['user_id', $user->id]])->first();
        if ($stripe) {
            $stripe_info = json_decode($stripe->information, true);
            $data['stripe_key'] = $stripe_info['key'];
        } else {
            $stripe_info = [];
            $data['stripe_key'] = '';
        }
        return view('user-front.checkout', $data);
    }

    public function coupon(Request $request)
    {
        $keywords = getUserKeywords();
        $user = getUser();

        $coupon = UserCoupon::where('code', $request->coupon)->where('user_id', $user->id);
        $userBs = BasicSetting::where('user_id', $user->id)->first();

        if ($coupon->count() == 0) {
            return response()->json([
                'status' => 'error',
                'message' => $keywords['coupon_not_valid'] ?? __('Coupon is not valid.') . '.'
            ]);
        } else {
            $coupon = $coupon->first();
            if (cartTotal() < $coupon->minimum_spend) {

                $message = $keywords['coupon_minimum_spend_error'] ?? __('Cart total must be minimum {minimum_spend} {currency}.');

                $message = str_replace(
                    ['{minimum_spend}', '{currency}'],
                    [$coupon->minimum_spend, $userBs->base_currency_text],
                    $message
                );

                return response()->json([
                    'status' => 'error',
                    'message' => $message
                ]);
            }
            $start = Carbon::parse($coupon->start_date);
            $end = Carbon::parse($coupon->end_date);
            $today = Carbon::now();
            // return response()->json($today->greaterThanOrEqualTo($start));
            // if coupon is active
            if ($today->greaterThanOrEqualTo($start) && $today->lessThan($end)) {
                $cartTotal = cartTotal();
                $value = $coupon->value;
                $type = $coupon->type;

                if ($type == 'fixed') {
                    if ($value > cartTotal()) {
                        return response()->json([
                            'status' => 'error',
                            'message' => $keywords['coupon_discount_greater_than_cart'] ?? __('Coupon discount is greater than cart total.') . '.'
                        ]);
                    }
                    $couponAmount = $value;
                } else {
                    $couponAmount = ($cartTotal * $value) / 100;
                }
                session()->put('user_coupon', round($couponAmount, 2));

                return response()->json([
                    'status' => 'success',
                    'message' => $keywords['coupon_applied_success'] ?? __('Coupon applied successfully.') . '.'
                ]);
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => $keywords['coupon_not_valid'] ?? __('Coupon is not valid.') . '.'
                ]);
            }
        }
    }
}
