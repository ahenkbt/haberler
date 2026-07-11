<?php

use Carbon\Carbon;
use App\Models\Page;
use App\Models\User;
use App\Models\Language;
use App\Models\User\UserItem;
use App\Models\User\Language as UserLanguage;
use App\Models\User\UserShopSetting;
use App\Models\User\Page as UserPage;
use App\Models\User\UserAdvertisement;
use Illuminate\Support\Facades\Config;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\BasicSetting as AdminBasicSettings;
use App\Models\PaymentGateway;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;

if (!function_exists('setEnvironmentValue')) {
    function setEnvironmentValue(array $values)
    {
        $envFile = app()->environmentFilePath();
        $str = file_get_contents($envFile);

        if (count($values) > 0) {
            foreach ($values as $envKey => $envValue) {

                $str .= "\n"; // In case the searched variable is in the last line without \n
                $keyPosition = strpos($str, "{$envKey}=");
                $endOfLinePosition = strpos($str, "\n", $keyPosition);
                $oldLine = substr($str, $keyPosition, $endOfLinePosition - $keyPosition);

                // If key does not exist, add it
                if (!$keyPosition || !$endOfLinePosition || !$oldLine) {
                    $str .= "{$envKey}={$envValue}\n";
                } else {
                    $str = str_replace($oldLine, "{$envKey}={$envValue}", $str);
                }
            }
        }

        $str = substr($str, 0, -1);
        if (!file_put_contents($envFile, $str)) return false;
        return true;
    }
}

if (!function_exists('toastrMsg')) {

    function toastrMsg($msg)
    {
        if (Auth::check()) {

            if (session()->has('userDashboardLang')) {
                $lang = Language::where('code', session()->get('userDashboardLang'))->first();
            } else {

                $lang = Language::where('is_default', 1)->first();
            }

            $keywords = json_decode($lang->user_keywords, true);

            return $keywords[$msg] ?? '';
        }
    }
}

if (!function_exists('replaceBaseUrl')) {
    function replaceBaseUrl($html)
    {
        $startDelimiter = 'src="';
        $endDelimiter = public_path('assets/front/img/summernote');
        $startDelimiterLength = strlen($startDelimiter);
        $endDelimiterLength = strlen($endDelimiter);
        $startFrom = $contentStart = $contentEnd = 0;
        while (false !== ($contentStart = strpos($html, $startDelimiter, $startFrom))) {
            $contentStart += $startDelimiterLength;
            $contentEnd = strpos($html, $endDelimiter, $contentStart);
            if (false === $contentEnd) {
                break;
            }
            $html = substr_replace($html, url('/'), $contentStart, $contentEnd - $contentStart);
            $startFrom = $contentEnd + $endDelimiterLength;
        }
        return $html;
    }
}


if (!function_exists('convertUtf8')) {
    function convertUtf8($value)
    {
        if (!empty($value)) {
            return mb_detect_encoding($value, mb_detect_order(), true) === 'UTF-8' ? $value : mb_convert_encoding($value, 'UTF-8');
        } else {
            return null;
        }
    }
}


if (!function_exists('make_slug')) {
    function make_slug($string)
    {
        $slug = preg_replace('/\s+/u', '-', trim($string));
        $slug = str_replace("/", "", $slug);
        $slug = str_replace("?", "", $slug);
        return mb_strtolower($slug, 'UTF-8');
    }
}


if (!function_exists('make_input_name')) {
    function make_input_name($string)
    {
        return preg_replace('/\s+/u', '_', trim($string));
    }
}

if (!function_exists('hasCategory')) {
    function hasCategory($version)
    {
        if (strpos($version, "no_category") !== false) {
            return false;
        } else {
            return true;
        }
    }
}

if (!function_exists('isDark')) {
    function isDark($version)
    {
        if (strpos($version, "dark") !== false) {
            return true;
        } else {
            return false;
        }
    }
}

if (!function_exists('slug_create')) {
    function slug_create($val)
    {
        $slug = preg_replace('/\s+/u', '-', trim($val));
        $slug = str_replace("/", "", $slug);
        $slug = str_replace("?", "", $slug);
        return mb_strtolower($slug, 'UTF-8');
    }
}

if (!function_exists('hex2rgb')) {
    function hex2rgb($colour)
    {
        if ($colour[0] == '#') {
            $colour = str_replace("#", "", $colour);
        }
        if (strlen($colour) == 6) {
            list($r, $g, $b) = array($colour[0] . $colour[1], $colour[2] . $colour[3], $colour[4] . $colour[5]);
        } elseif (strlen($colour) == 3) {
            list($r, $g, $b) = array($colour[0] . $colour[0], $colour[1] . $colour[1], $colour[2] . $colour[2]);
        } else {
            return false;
        }
        $r = hexdec($r);
        $g = hexdec($g);
        $b = hexdec($b);
        return array('red' => $r, 'green' => $g, 'blue' => $b);
    }
}


if (!function_exists('getHref')) {
    function getHref($link)
    {
        $href = "#";
        if ($link["type"] == 'home') {
            $href = route('front.index');
        } else if ($link["type"] == 'listings') {
            $href = route('front.user.view');
        } else if ($link["type"] == 'pricing') {
            $href = route('front.pricing');
        } else if ($link["type"] == 'faq') {
            $href = route('front.faq.view');
        } else if ($link["type"] == 'blog') {
            $href = route('front.blogs');
        } else if ($link["type"] == 'contact') {
            $href = route('front.contact');
        } else if ($link["type"] == 'templates') {
            $href = route('front.templates');
        } else if ($link["type"] == 'vcards') {
            $href = route('front.vcards');
        } else if ($link["type"] == 'custom') {
            if (empty($link["href"])) {
                $href = "#";
            } else {
                $href = $link["href"];
            }
        } else {
            $pageid = (int)$link["type"];
            $page = Page::find($pageid);
            if (!empty($page)) {
                $href = route('front.dynamicPage', [$page->slug]);
            } else {
                $href = "#";
            }
        }
        return $href;
    }
}


if (!function_exists('getUserHref')) {
    function getUserHref($link)
    {
        $href = "#";
        if ($link["type"] == 'home') {
            $href = route('front.user.detail.view', getParam());
        } else if ($link["type"] == 'services') {
            $href = route('front.user.services', getParam());
        } else if ($link["type"] == 'blog') {
            $href = route('front.user.blogs', getParam());
        } else if ($link["type"] == 'portfolios') {
            $href = route('front.user.portfolios', getParam());
        } else if ($link["type"] == 'contact') {
            $href = route('front.user.contact', getParam());
        } else if ($link["type"] == 'team') {
            $href = route('front.user.team', getParam());
        } else if ($link["type"] == 'faq') {
            $href = route('front.user.faq', getParam());
        } else if ($link["type"] == 'rooms') {
            $href = route('front.user.rooms', getParam());
        } else if ($link["type"] == 'courses') {
            $href = route('front.user.courses', getParam());
        } else if ($link["type"] == 'causes') {
            $href = route('front.user.causes', getParam());
        } else if ($link["type"] == 'shop') {
            $href = route('front.user.shop', getParam());
        } else if ($link["type"] == 'cart') {
            $href = route('front.user.cart', getParam());
        } else if ($link["type"] == 'checkout') {
            $href = route('front.user.checkout', getParam());
        } else if ($link["type"] == 'career') {
            $href = route('front.user.jobs', getParam());
        } else if ($link["type"] == 'gallery') {
            $href = route('front.user.galleries', getParam());
        } else if ($link["type"] == 'custom') {
            if (empty($link["href"])) {
                $href = "#";
            } else {
                $href = $link["href"];
            }
        } else {
            $pageid = (int)$link["type"];
            $page = UserPage::find($pageid);
            if (!empty($page)) {
                $href = route('front.user.cpage', [getParam(), $page->slug]);
            } else {
                $href = "#";
            }
        }
        return $href;
    }
}

if (!function_exists('format_price')) {
    function format_price($value): string
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()
                ->get('lang'))
                ->first();
        } else {
            $currentLang = Language::where('is_default', 1)
                ->first();
        }
        $bex = $currentLang->basic_extended;
        if ($bex->base_currency_symbol_position == 'left') {
            return $bex->base_currency_symbol . $value;
        } else {
            return $value . $bex->base_currency_symbol;
        }
    }
}




if (!function_exists('create_menu')) {
    function create_menu($arr)
    {
        echo '<ul class="sub-menu">';
        foreach ($arr["children"] as $el) {
            // determine if the class is 'submenus' or not
            $class = 'class="nav-item"';
            if (array_key_exists("children", $el)) {
                $class = 'class="nav-item submenus"';
            }
            // determine the href
            $href = getHref($el);
            echo '<li ' . $class . '>';
            echo '<a  href="' . $href . '" target="' . $el["target"] . '">' . $el["text"] . '</a>';
            if (array_key_exists("children", $el)) {
                create_menu($el);
            }
            echo '</li>';
        }
        echo '</ul>';
    }
}

if (!function_exists('getUser')) {

    function getUser()
    {

        $bs = AdminBasicSettings::first();
        Config::set('app.timezone', $bs->timezone);

        $parsedUrl = parse_url(url()->current());

        $host =  $parsedUrl['host'];

        // if the current URL contains the website domain
        if (strpos($host, env('WEBSITE_HOST')) !== false) {
            $host = str_replace('www.', '', $host);
            // if current URL is a path based URL
            if ($host == env('WEBSITE_HOST')) {
                $path = explode('/', $parsedUrl['path']);
                $username = $path[1];
            }
            // if the current URL is a subdomain
            else {
                $hostArr = explode('.', $host);
                $username = $hostArr[0];
            }

            if (($host == $username . '.' . env('WEBSITE_HOST')) || ($host . '/' . $username == env('WEBSITE_HOST') . '/' . $username)) {
                $user = User::where('username', $username)
                    ->where('online_status', 1)
                    ->where('status', 1)
                    ->whereHas('memberships', function ($q) {
                        $q->where('status', '=', 1)
                            ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                            ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
                    })
                    ->first();

                //if user expired
                if (!$user) {
                    abort(404);
                }
                // if the current url is a subdomain
                if ($host != env('WEBSITE_HOST')) {
                    if (!cPackageHasSubdomain($user)) {
                        return view('errors.404');
                    }
                }

                return $user;
            }
        }

        // Always include 'www.' at the begining of host
        if (substr($host, 0, 4) == 'www.') {
            $host = $host;
        } else {
            $host = 'www.' . $host;
        }


        $user = User::where('online_status', 1)
            ->where('status', 1)
            ->whereHas('user_custom_domains', function ($q) use ($host) {
                $q->where('status', '=', 1)
                    ->where(function ($query) use ($host) {
                        $query->where('requested_domain', '=', $host)
                            ->orWhere('requested_domain', '=', str_replace("www.", "", $host));
                    });
                // fetch the custom domain , if it matches 'with www.' URL or 'without www.' URL
            })
            ->whereHas('memberships', function ($q) {
                $q->where('status', '=', 1)
                    ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                    ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
            })->firstOrFail();


        if (!cPackageHasCdomain($user)) {
            return view('errors.404');
        }

        return $user;
    }
}

// checks if 'current package has subdomain ?'

if (!function_exists('cPackageHasSubdomain')) {
    function cPackageHasSubdomain($user): bool
    {
        $currPackageFeatures = UserPermissionHelper::packagePermission($user->id);
        $currPackageFeatures = json_decode($currPackageFeatures, true);

        // if the current package does not contain subdomain
        if (empty($currPackageFeatures) || !is_array($currPackageFeatures) || !in_array('Subdomain', $currPackageFeatures)) {
            return false;
        }
        return true;
    }
}


// checks if 'current package has custom domain ?'
if (!function_exists('cPackageHasCdomain')) {
    function cPackageHasCdomain($user): bool
    {
        $currPackageFeatures = UserPermissionHelper::packagePermission($user->id);
        $currPackageFeatures = json_decode($currPackageFeatures, true);

        if (empty($currPackageFeatures) || !is_array($currPackageFeatures) || !in_array('Custom Domain', $currPackageFeatures)) {
            return false;
        }
        return true;
    }
}

if (!function_exists('getCdomain')) {

    function getCdomain($user)
    {
        $cdomains = $user->custom_domains()->where('status', 1);
        return $cdomains->count() > 0 ? $cdomains->orderBy('id', 'DESC')->first()->requested_domain : false;
    }
}

if (!function_exists('getUser')) {

    function getUser()
    {

        $bs = AdminBasicSettings::first();
        Config::set('app.timezone', $bs->timezoneinfo->timezone);

        $parsedUrl = parse_url(url()->current());

        $host =  $parsedUrl['host'];

        // if the current URL contains the website domain
        if (strpos($host, env('WEBSITE_HOST')) !== false) {
            $host = str_replace('www.', '', $host);
            // if current URL is a path based URL
            if ($host == env('WEBSITE_HOST')) {
                $path = explode('/', $parsedUrl['path']);
                $username = $path[1];
            }
            // if the current URL is a subdomain
            else {
                $hostArr = explode('.', $host);
                $username = $hostArr[0];
            }

            $user = User::where('username', $username)
                ->where('online_status', 1)
                ->where('status', 1)
                ->whereHas('memberships', function ($q) {
                    $q->where('status', '=', 1)
                        ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                        ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
                })
                ->firstOrFail();
            // if the current url is a subdomain
            if ($host != env('WEBSITE_HOST')) {
                if (!cPackageHasSubdomain($user)) {
                    return view('errors.404');
                }
            }
        } else {
            // Always include 'www.' at the begining of host
            if (substr($host, 0, 4) == 'www.') {
                $host = $host;
            } else {
                $host = 'www.' . $host;
            }
            $user = User::where('online_status', 1)->where('status', 1)
                ->whereHas('user_custom_domains', function ($q) use ($host) {
                    $q->where('status', '=', 1)
                        ->where('requested_domain', '=', $host)
                        ->orWhere('requested_domain', '=', str_replace("www.", "", $host));
                    // fetch the custom domain , if it matches 'with www.' URL or 'without www.' URL
                })
                ->whereHas('memberships', function ($q) {
                    $q->where('status', '=', 1)
                        ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                        ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
                })->firstOrFail();
            if (!cPackageHasCdomain($user)) {
                return view('errors.404');
            }
        }

        return $user;
    }
}

if (!function_exists('getParam')) {

    function getParam()
    {
        $parsedUrl = parse_url(url()->current());
        $host = str_replace("www.", "", $parsedUrl['host']);

        // if it is path based URL, then return {username}
        if (strpos($host, env('WEBSITE_HOST')) !== false && $host == env('WEBSITE_HOST')) {
            $path = explode('/', $parsedUrl['path']);
            return $path[1];
        }

        // if it is a subdomain / custom domain , then return the host (username.domain.ext / custom_domain.ext)
        return $host;
    }
}


if (!function_exists('cartLength')) {
    function cartLength()
    {
        $length = 0;
        if (session()->has('cart') && !empty(session()->get('cart'))) {
            $cart = session()->get('cart');
            foreach ($cart as $key => $cartItem) {
                $length += (float)$cartItem['qty'];
            }
        }

        return round($length, 2);
    }
}

if (!function_exists('cartTotal')) {
    function cartTotal()
    {
        $total = 0;
        if (session()->has('cart') && !empty(session()->get('cart'))) {
            $cart = session()->get('cart');
            foreach ($cart as $key => $cartItem) {
                $total += $cartItem['total'];
            }
        }

        return round($total, 2);
    }
}

if (!function_exists('cartSubTotal')) {
    function cartSubTotal()
    {
        $coupon = session()->has('user_coupon') && !empty(session()->get('user_coupon')) ? session()->get('user_coupon') : 0;
        $cartTotal = cartTotal();
        $subTotal = $cartTotal - $coupon;

        return round($subTotal, 2);
    }
}
if (!function_exists('onlyDigitalItemsInCart')) {
    function onlyDigitalItemsInCart()
    {
        $cart = session()->get('cart');
        if (!empty($cart)) {
            foreach ($cart as $key => $cartItem) {
                $item = UserItem::findorFail($cartItem["id"]);
                if ($item->type != 'digital') {
                    return false;
                }
            }
        }
        return true;
    }
}



if (!function_exists('onlyDigitalItems')) {
    function onlyDigitalItems($order)
    {

        $oitems = $order->orderitems;
        foreach ($oitems as $key => $oitem) {

            if ($oitem->item->type != 'digital') {
                return false;
            }
        }

        return true;
    }
}


if (!function_exists('tax')) {
    function tax()
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        $bex = UserShopSetting::where('user_id', $user->id)->first();
        $tax = $bex->tax;
        if (session()->has('cart') && !empty(session()->get('cart'))) {
            $tax = (cartSubTotal() * $tax) / 100;
        }

        return round($tax, 2);
    }
}



if (!function_exists('coupon')) {
    function coupon()
    {
        return session()->has('user_coupon') && !empty(session()->get('user_coupon')) ? round(session()->get('user_coupon'), 2) : 0.00;
    }
}






if (!function_exists('detailsUrl')) {

    function detailsUrl($user)
    {
        return '//' . env('WEBSITE_HOST') . '/' . $user->username;
    }
}



if (!function_exists('detailsUrl')) {

    function detailsUrl($user)
    {
        return '//' . env('WEBSITE_HOST') . '/' . $user->username;
    }
}
if (!function_exists('formatNumber')) {
    function formatNumber($number)
    {
        try {
            if (strpos($number, '.00', -3)  !== false) {
                return str_replace('.00', '', $number);
            } else {
                return $number;
            }
        } catch (\Throwable $th) {
            return $number;
        }
    }
}

if (!function_exists('paytabInfo')) {
    function paytabInfo($type, $user_id = null)
    {
        if ($type == 'user') {
            $paytabs = UserPaymentGeteway::where([['user_id', $user_id], ['keyword', 'paytabs']])->first();
        } else {
            $paytabs = PaymentGateway::where('keyword', 'paytabs')->first();
        }
        $paytabsInfo = json_decode($paytabs->information, true);
        if ($paytabsInfo['country'] == 'global') {
            $currency = 'USD';
        } elseif ($paytabsInfo['country'] == 'sa') {
            $currency = 'SAR';
        } elseif ($paytabsInfo['country'] == 'uae') {
            $currency = 'AED';
        } elseif ($paytabsInfo['country'] == 'egypt') {
            $currency = 'EGP';
        } elseif ($paytabsInfo['country'] == 'oman') {
            $currency = 'OMR';
        } elseif ($paytabsInfo['country'] == 'jordan') {
            $currency = 'JOD';
        } elseif ($paytabsInfo['country'] == 'iraq') {
            $currency = 'IQD';
        } else {
            $currency = 'USD';
        }
        return [
            'server_key' => $paytabsInfo['server_key'],
            'profile_id' => $paytabsInfo['profile_id'],
            'url'        => $paytabsInfo['api_endpoint'],
            'currency'   => $currency,
        ];
    }
}


if (!function_exists('rtlClass')) {
    function rtlClass($lang)
    {
        $currentLangCode = str_replace('user_', '', session()->get('user_dashboard_lang'));
        if ($currentLangCode) {
            $mainLang = App\Models\Language::where('code', $currentLangCode)
                ->select('rtl')
                ->first();
        } else {
            $mainLang = App\Models\Language::where('is_default', 1)
                ->first();
        }

        return $lang->rtl == 1 && $mainLang->rtl != 1  ? 'rtl text-right' : '';
    }
}

if (!function_exists('ltrClass')) {
    function ltrClass($lang)
    {
        $currentLangCode = str_replace('user_', '', session()->get('user_dashboard_lang'));
        if ($currentLangCode) {
            $mainLang = App\Models\Language::where('code', $currentLangCode)
                ->select('rtl')
                ->first();
        } else {
            $mainLang = App\Models\Language::where('dashboard_default', 1)
                ->first();
        }

        return $lang->rtl != 1 && $mainLang->rtl == 1  ? 'force-ltr' : '';
    }
}

if (!function_exists('userDashboardLangCode')) {
    function userDashboardLangCode($user)
    {

        $defaultCode = \App\Models\Language::where('is_default', 1)->value('code');

        if (!$user) return $defaultCode;

        $dashboardLangId = \App\Models\User\BasicSetting::where('user_id', $user->id)
            ->value('dashboard_language');

        if (!$dashboardLangId) return $defaultCode;

        $userLangCode = \App\Models\Language::where('id', $dashboardLangId)->value('code');

        return $userLangCode ?? $defaultCode;
    }
}

if (!function_exists('getUserKeywords')) {
    function getUserKeywords()
    {
        $user = session()->get('user_midtrans') ?? getUser();

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))
                ->where('user_id', $user->id)
                ->first();

            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)
                    ->where('user_id', $user->id)
                    ->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)
                ->where('user_id', $user->id)
                ->first();
        }

        return $userCurrentLang ? json_decode($userCurrentLang->keywords, true) : [];
    }
}
