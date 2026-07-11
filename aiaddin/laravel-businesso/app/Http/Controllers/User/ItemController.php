<?php

namespace App\Http\Controllers\User;


use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\UserItem;
use App\Http\Helpers\Uploader;
use App\Models\User\BasicSetting;
use App\Models\User\UserItemImage;
use Illuminate\Support\Facades\DB;
use Mews\Purifier\Facades\Purifier;
use App\Http\Controllers\Controller;
use App\Models\User\UserItemContent;
use App\Models\User\UserShopSetting;
use Illuminate\Support\Facades\Auth;
use App\Models\User\UserItemCategory;
use App\Models\User\UserItemVariation;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserItemSubCategory;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $lang_id = $lang->id;
        $title =  request('title');
        $data['items'] = DB::table('user_items')->where('user_items.user_id', Auth::guard('web')->user()->id)
            ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
            ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
            ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
            ->orderBy('user_items.id', 'DESC')
            ->when($title, function ($query, $title) {
                $query->where('user_item_contents.title', 'LIKE', '%' . $title . '%');
            })
            ->where('user_item_contents.language_id', '=', $lang_id)
            ->where('user_item_categories.language_id', '=', $lang_id)
            ->paginate(15);
        $data['lang_id'] = $lang_id;
        $data['lang'] = $lang;

        return view('user.item.index', $data);
    }


    public function type(Request $request)
    {
        $data['digitalCount'] = UserItem::where('type', 'digital')->where('user_id', Auth::guard('web')->user()->id)->count();
        $data['physicalCount'] = UserItem::where('type', 'physical')->where('user_id', Auth::guard('web')->user()->id)->count();
        return view('user.item.type', $data);
    }


    public function create(Request $request)
    {
        $data['lang'] = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $data['languages'] = Language::where('user_id', Auth::guard('web')->user()->id)->get();
      
        return view('user.item.create', $data);
    }

    public function getCategory($langid)
    {
        $category = UserItemCategory::where('language_id', $langid)->where('user_id', Auth::guard('web')->user()->id)->get();
        return $category;
    }

    public function store(Request $request)
    {

        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $messages = [];
        $rules = [];
        $thumbnailImgURL = $request->thumbnail;
        $sliderImgURLs = $request->has('image') ? $request->image : [];
        $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');
        $thumbnailImgExt = $thumbnailImgURL ? $thumbnailImgURL->extension() : null;
        $sliderImgExts = [];

        $rules['image'] = [
            'required',
            function ($attribute, $value, $fail) use ($allowedExtensions, $sliderImgExts) {
                if (!empty($sliderImgExts)) {
                    foreach ($sliderImgExts as $sliderImgExt) {
                        if (!in_array($sliderImgExt, $allowedExtensions)) {
                            $fail(__('Only .jpg, .jpeg, .png and .svg file is allowed for slider image') . '.');
                            break;
                        }
                    }
                }
            }
        ];

        $rules['thumbnail'] = [
            'required',
            function ($attribute, $value, $fail) use ($allowedExtensions, $thumbnailImgExt) {
                if (!in_array($thumbnailImgExt, $allowedExtensions)) {
                    $fail(__('Only .jpg, .jpeg, .png and .svg file is allowed for thumbnail image') . '.');
                }
            }
        ];
        
        // $messages['image.required'] = __('The slider Image is required') . '.';
        $rules['status'] = 'required';
        $rules['current_price'] = 'required|numeric';
        $rules['previous_price'] = 'nullable|numeric';

        foreach ($languages as $language) {
            $rules[$language->code . '_title'] = 'required';
            $rules[$language->code . '_category'] = 'required';
            $rules[$language->code . '_subcategory'] = 'required';
            $messages[$language->code . '_category.required'] = __('The Category field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messages[$language->code . '_subcategory.required'] = __('The Subcategory field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messages[$language->code . '_title.required'] = __('The Title field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $allowedExts = array('zip');
        }


        // if product type is 'physical'
        if ($request->type == 'physical') {
            $rules['sku'] = 'required';
        }

        // if product type is 'digital'
        if ($request->type == 'digital') {
            $rules['file_type'] = 'required';
            // if 'file upload' is chosen
            if ($request->has('file_type') && $request->file_type == 'upload') {
                $allowedExts = array('zip');
                $rules['download_file'] = [
                    'required',
                    function ($attribute, $value, $fail) use ($request, $allowedExts) {
                        $file = $request->file('download_file');
                        $ext = $file->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only zip file is allowed') . "!");
                        }
                    }
                ];
            }
            // if 'file donwload link' is chosen
            elseif ($request->has('file_type') && $request->file_type == 'link') {
                $rules['download_link'] = 'required';
            }
        }

        $validator = Validator::make($request->all(), $rules, $messages);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        if (!empty($sliderImgURLs)) {
            foreach ($sliderImgURLs as $sliderImgURL) {
                $n = strrpos($sliderImgURL, ".");
                $extension = ($n === false) ? "" : substr($sliderImgURL, $n + 1);
                array_push($sliderImgExts, $extension);
            }
        }
        // slug validations
        foreach ($languages as $language) {
            $adContent = UserItemContent::where('language_id', $language->id)->where('slug', make_slug($request[$language->code . '_title']))
                ->first();
            if ($adContent) {
                Session::flash('warning', __('This Item Already Exist') . '!');
                return "success";
            }
        }
        // if the type is digital && 'upload file' method is selected, then store the downloadable file
        if ($request->type == 'digital' && $request->file_type == 'upload') {
            if ($request->hasFile('download_file')) {
                $digitalFile = $request->file('download_file');
                $filename = time() . '-' . uniqid() . "." . $digitalFile->extension();
                $directory = base_path('core/storage/digital_products/');
                @mkdir($directory, 0775, true);
                $digitalFile->move($directory, $filename);
            }
        }


        $item = new UserItem();
        // set a name for the thumbnail image and store it to local storage
        $thumbnailImgName = time() . '.' . $thumbnailImgExt;
        $thumbnailDir = public_path('assets/front/img/user/items/thumbnail/');
        @mkdir($thumbnailDir, 0775, true);
        @copy($thumbnailImgURL, $thumbnailDir . $thumbnailImgName);
        $sliderDir = public_path('assets/front/img/user/items/slider-images/');
        @mkdir($sliderDir, 0775, true);
        $item->user_id = Auth::guard('web')->user()->id;
        $item->stock = $request->stock ?? 0;
        $item->sku = $request->sku;
        $item->thumbnail = $thumbnailImgName;
        $item->status = $request->status;
        $item->current_price = $request->current_price;
        $item->previous_price = $request->previous_price ?? 0.00;
        $item->type = $request->type;
        $item->download_file = $filename ?? null;
        $item->download_link = $request->download_link;
        $item->save();
        foreach ($request->image as $value) {
            UserItemImage::create([
                'item_id' => $item->id,
                'image' => $value,
            ]);
        }
        // store varations as json
        foreach ($languages as $language) {
            $adContent = new UserItemContent();
            $adContent->item_id = $item->id;
            $adContent->language_id = $language->id;
            $adContent->category_id = $request[$language->code . '_category'];
            $adContent->subcategory_id = $request[$language->code . '_subcategory'];
            $adContent->title = $request[$language->code . '_title'];
            $adContent->slug = make_slug($request[$language->code . '_title']);
            $adContent->summary = $request[$language->code . '_summary'];
            $adContent->tags = $request[$language->code . '_tags'];
            $adContent->description = Purifier::clean($request[$language->code . '_description']);
            $adContent->meta_keywords = $request[$language->code . '_keyword'];
            $adContent->meta_description = $request[$language->code . '_meta_keyword'];
            $adContent->save();
        }
        Session::flash('success', __('Item added successfully') . '!');
        return "success";
    }
    public function edit(Request $request, $id)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $data['languages'] = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $data['item'] = UserItem::findOrFail($id);
        return view('user.item.edit', $data);
    }

    public function update(Request $request)
    {
        $item = UserItem::findOrFail($request->item_id);
        $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');
        if ($request->hasFile('thumbnail')) {
            $thumbnailImgURL = $request->thumbnail;
            $thumbnailImgExt = $thumbnailImgURL ? $thumbnailImgURL->extension() : null;
            $rules['thumbnail'] = function ($attribute, $value, $fail) use ($allowedExtensions, $thumbnailImgExt) {
                if (!in_array($thumbnailImgExt, $allowedExtensions)) {
                    $fail(__('Only .jpg, .jpeg, .png and .svg file is allowed for thumbnail image') . '.');
                }
            };
        }
        $sliderImgURLs = array_key_exists("image", $request->all()) && count($request->image) > 0 ? $request->image : [];
        $sliderImgExts = [];
        // get all the slider images extension
        if (!empty($sliderImgURLs)) {
            foreach ($sliderImgURLs as $sliderImgURL) {
                $n = strrpos($sliderImgURL, ".");
                $extension = ($n === false) ? "" : substr($sliderImgURL, $n + 1);
                array_push($sliderImgExts, $extension);
            }
        }
        if (array_key_exists("image", $request->all()) && count($request->image) > 0) {
            $rules['image'] = function ($attribute, $value, $fail) use ($allowedExtensions, $sliderImgExts) {
                foreach ($sliderImgExts as $sliderImgExt) {
                    if (!in_array($sliderImgExt, $allowedExtensions)) {
                        $fail(__('Only .jpg, .jpeg, .png and .svg file is allowed for slider image') . '.');
                        break;
                    }
                }
            };
        }
        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $rules['status'] = 'required';
        $rules['current_price'] = 'required|numeric';
        $rules['previous_price'] = 'nullable|numeric';
        $messages = [];
        foreach ($languages as $language) {
            $rules[$language->code . '_title'] = 'required';
            $rules[$language->code . '_category'] = 'required';
            $rules[$language->code . '_subcategory'] = 'required';
            $messages[$language->code . '_category.required'] = __('The category field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messages[$language->code . '_subcategory.required'] = __('The Subcategory field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messages[$language->code . '_title.required'] = __('The Title field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $allowedExts = array('zip');
        }
        // if product type is 'physical'
        if ($item->type == 'physical') {
            $rules['sku'] = 'required';
        }
        // if product type is 'digital'
        if ($item->type == 'digital') {
            // if 'file upload' is chosen
            if ($request->has('file_type') && $request->file_type == 'upload') {
                if (empty($item->download_file)) {
                    $rules['download_file'][] = 'required';
                }
                $rules['download_file'][] = function ($attribute, $value, $fail) use ($item, $request) {
                    $allowedExts = array('zip');
                    if ($request->hasFile('download_file')) {
                        $file = $request->file('download_file');
                        $ext = $file->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only zip file is allowed') . "!");
                        }
                    }
                };
            }
            // if 'file donwload link' is chosen
            elseif ($request->has('file_type') && $request->file_type == 'link') {
                $rules['download_link'] = 'required';
            }
        }

        $validator = Validator::make($request->all(), $rules, $messages);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }


        foreach ($languages as $language) {
            $adContent = UserItemContent::where('language_id', $language->id)->where('slug', make_slug($request[$language->code . '_title']))
                ->first();
            if ($adContent) {
                if ($adContent->item_id != $request->item_id) {
                    Session::flash('warning', __('This Item Already Exist') . '!');
                    return "success";
                }
            }
        }
        if (!empty($sliderImgURLs)) {
            foreach ($sliderImgURLs as $sliderImgURL) {
                $n = strrpos($sliderImgURL, ".");
                $extension = ($n === false) ? "" : substr($sliderImgURL, $n + 1);
                array_push($sliderImgExts, $extension);
            }
        }

        // if the type is digital && 'upload file' method is selected, then store the downloadable file
        if ($request->type == 'digital' && $request->file_type == 'upload') {

            if ($request->hasFile('download_file')) {
                $digitalFile = $request->file('download_file');
                $filename = time() . '-' . uniqid() . "." . $digitalFile->extension();
                $directory = base_path('core/storage/digital_products/');
                @mkdir($directory, 0775, true);
                $digitalFile->move($directory, $filename);
            } else {
                $filename = $item->download_file;
            }
        }

        if ($request->hasFile('thumbnail')) {
            $thumbnailImgURL = $request->thumbnail;
            // first, delete the previous image from local storage
            @unlink(public_path('assets/front/img/user/items/thumbnail/' . $item->thumbnail));

            // second, set a name for the image and store it to local storage
            $thumbnailImgName = time() . '.' . $thumbnailImgExt;
            $thumbnailDir = public_path('assets/front/img/user/items/thumbnail/');

            @copy($thumbnailImgURL, $thumbnailDir . $thumbnailImgName);
        }
        $item->stock = $request->stock ?? 0;
        $item->sku = $request->sku;
        $item->status = $request->status;
        $item->thumbnail = $request->hasFile('thumbnail') ? $thumbnailImgName : $item->thumbnail;
        $item->current_price = $request->current_price;
        $item->previous_price = $request->previous_price ?? 0.00;
        $item->type = $request->type;
        $item->download_file = $filename ?? null;
        $item->download_link = $request->download_link ?? null;
        $item->save();
        if ($request->image) {
            foreach ($request->image as $value) {
                UserItemImage::create([
                    'item_id' => $item->id,
                    'image' => $value,
                ]);
            }
        }
        foreach ($languages as $language) {
            $adContent = UserItemContent::where('item_id', $request->item_id)
                ->where('language_id', $language->id)->first();
            if (empty($adContent)) {
                $adContent = new UserItemContent;
                $adContent->item_id = $request->item_id;
                $adContent->language_id = $language->id;
            }
            $adContent->category_id = $request[$language->code . '_category'];
            $adContent->subcategory_id = $request[$language->code . '_subcategory'];
            $adContent->title = $request[$language->code . '_title'];
            $adContent->slug = make_slug($request[$language->code . '_title']);
            $adContent->summary = $request[$language->code . '_summary'];
            $adContent->tags = $request[$language->code . '_tags'];
            $adContent->description = Purifier::clean($request[$language->code . '_description']);
            $adContent->meta_keywords = $request[$language->code . '_keyword'];
            $adContent->meta_description = $request[$language->code . '_meta_keyword'];
            $adContent->save();
        }
        Session::flash('success', __('Product updated successfully') . '!');
        return "success";
    }
    public function feature(Request $request)
    {

        $item = UserItem::findOrFail($request->item_id);
        $item->is_feature = $request->is_feature;
        $item->save();

        if ($request->is_feature == 1) {
            Session::flash('success', __('Item featured successfully') . '!');
        } else {
            Session::flash('success', __('Item unfeatured successfully') . '!');
        }
        return back();
    }
    public function specialOffer(Request $request)
    {
        $item = UserItem::findOrFail($request->item_id);
        $item->special_offer = $request->special_offer;
        $item->save();
        if ($request->special_offer == 1) {
            Session::flash('success', __('Item added to Special offer successfully') . '!');
        } else {
            Session::flash('success', __('Item remove from Special offer successfully') . '!');
        }
        return back();
    }


    public function delete(Request $request)
    {
        $item = UserItem::findOrFail($request->item_id);
        @unlink(public_path('assets/front/img/user/items/thumbnail/' . $item->thumbnail));
        foreach ($item->sliders as $key => $image) {
            @unlink(public_path('assets/front/img/user/items/slider-images/' . $image->image));
            $image->delete();
        }
        $item->itemContents()->delete();
        $item->delete();
        Session::flash('success', __('Item deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $item = UserItem::findOrFail($id);
            @unlink(public_path('assets/front/img/user/items/thumbnail/' . $item->thumbnail));
            foreach ($item->sliders as $key => $image) {
                @unlink(public_path('assets/front/img/user/items/slider-images/' . $image->image));
                $image->delete();
            }
            $item->itemContents()->delete();
            $item->delete();
        }
        Session::flash('success', __('Product deleted successfully') . '!');
        return "success";
    }
    public function variationStore(Request $request)
    {
        $variation_helper = $request->variation_helper ?? [];
        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $variation_counter = is_array($variation_helper) ? array_count_values($variation_helper) : [];
        $check_var = UserItemVariation::where('item_id', $request->item_id)->delete();
        if (!empty($request->variation_helper)) {
            foreach ($variation_counter as $key => $v_helper) {
                foreach ($languages as $lkey => $value) {
                    if (!empty($request[$value->code . '_options1' . '_' .  $key])) {
                        foreach ($request[$value->code . '_options1' . '_' .  $key] as  $option) {
                            if (empty($option)) {
                                Session::flash('warning', __('Options are missing') . '.');
                                return "success";
                            }
                        }
                    } else {
                        Session::flash('success', __('Variations Updated') . '!');
                        return "success";
                    }
                    UserItemVariation::create([
                        'item_id' => $request->item_id,
                        'language_id' => $value->id,
                        'variant_name' => $request[$value->code . '_variation_' . $key],
                        'option_name' => json_encode($request[$value->code . '_options1' . '_' .  $key]),
                        'option_price' => json_encode($request['options2' . '_' .  $key]),
                        'option_stock' => json_encode($request['options3' . '_' .  $key]),
                        'indx' =>  $key

                    ]);
                }
            }
        }
        // deleting null data
        UserItemVariation::where('item_id', $request->item_id)->where('variant_name', null)->delete();
        Session::flash('success', __('Variations added successfully') . '!');
        return "success";
    }

    public function variants($pid)
    {

        $variations = DB::table('user_item_variations')->where('item_id', $pid)->orderBy('indx')->get();
        $variants = [];
        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $i = 0;
        $v_index = 0;
        foreach ($languages as $lkey => $lvak) {
            $variants[$lkey][$v_index] = [
                $lvak->code . '_varient_name' => $variations->where('language_id', $lvak->id)->first()->variant_name,
                'uniqid' => uniqid()
            ];
            $option_prices = json_decode($variations->where('language_id', $lvak->id)->first()->option_price);
            $option_stocks = json_decode($variations->where('language_id', $lvak->id)->first()->option_stock);
            $v_index++;
        }

        return response()->json($variants);
        foreach ($variations as $key => $value) {

            $option_names = json_decode($value->option_name);
            $option_prices = json_decode($value->option_price);
            $option_stocks = json_decode($value->option_stock);
            $j = 0;
            foreach ($option_names as $okey => $val) {
                $variants[$i]['options'][$j]['name'] = $val;
                $variants[$i]['options'][$j]['price'] = $option_prices[$okey];
                $variants[$i]['options'][$j]['stock'] = $option_stocks[$okey];
                $j++;
            }
            $i++;
        }
        return response()->json($variants);
    }
    public function variations(UserItem $useritem)
    {
        $data['language'] = Language::where('user_id', Auth::guard('web')->user()->id)->where('code', request('language'))->first();
        $data['item'] = $useritem->itemContents()->where('language_id', $data['language']->id)->first();
        $data['item_id'] = $useritem->id;
        $data['ins'] = UserItemVariation::where('item_id', $useritem->id)->groupBy('indx')->select('indx')->get();

        $variations = [];

        foreach ($data['ins'] as $key => $value) {
            $variations[] = UserItemVariation::where('item_id', $useritem->id)->where('indx', $value->indx)->get();
        }

        $data['variations'] = $variations;
        $data['languages'] = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        return view('user.item.variation', $data);
    }

    public function settings()
    {
        $data['shopsettings'] = UserShopSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.item.settings', $data);
    }
    public function updateSettings(Request $request)
    {
        $request->validate([
            'is_shop' => 'required',
            'tax' => 'required',
            'item_rating_system' => 'required',
            'catalog_mode' => 'required',
        ]);
        $shopsettings = UserShopSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        if (!$shopsettings) {
            $shopsettings  = new UserShopSetting();
        }
        $shopsettings->user_id = Auth::guard('web')->user()->id;
        $shopsettings->is_shop = $request->is_shop;
        $shopsettings->item_rating_system = $request->item_rating_system;
        $shopsettings->catalog_mode = $request->catalog_mode;
        $shopsettings->tax = $request->tax ? $request->tax : 0.00;
        $shopsettings->save();
        Session::flash('success', __('Shop setting updated successfully') . '!');
        return "success";
    }
    public function slider(Request $request)
    {
        $filename = null;
        $request->validate([
            'file' => 'mimes:jpg,jpeg,png|required',
        ]);
        if ($request->hasFile('file')) {
            $filename = Uploader::upload_picture('assets/front/img/user/items/slider-images', $request->file('file'));
        }
        return response()->json(['status' => 'success', 'file_id' => $filename]);
    }
    public function sliderRemove(Request $request)
    {
        if (file_exists(public_path('assets/front/img/user/items/slider-images/' . $request->value))) {
            unlink(public_path('assets/front/img/user/items/slider-images/' . $request->value));
            return response()->json(['status' => 200, 'message' => 'success']);
        } else {
            return response()->json(['status' => 404, 'message' => 'error']);
        }
    }
    public function dbSliderRemove(Request $request)
    {
        $img = UserItemImage::findOrFail($request->id);
        @unlink(public_path('assets/front/img/user/items/slider-images/' . $img->image));
        $img->delete();
        return response()->json(['status' => 200, 'message' => 'success']);
    }
    public function subcatGetter(Request $request)
    {
        $data['subcategories'] = UserItemSubCategory::where('category_id', $request->category_id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->where('status', 1)
            ->get();
        return $data;
    }
    public function setFlashSale($id, Request $request)
    {

        $rules = [
            'start_date' => 'required',
            'start_time' => 'required',
            'end_date' => 'required',
            'end_time' => 'required',
            'flash_percentage' => 'required|numeric',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        $item = UserItem::findOrFail($id);
        $bs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->with('timezoneinfo')->first();
        Config::set('app.timezone', $bs->timezoneinfo->timezone);

        // if ($item->previous_price > 0) {
        //     Session::flash('warning', 'Please remove previous price of this item.');
        //     return "success";
        // }
        // Config::set('app.timezone', $timezone);

        $item->start_date = $request->start_date;
        $item->start_time = $request->start_time;
        $item->end_date = $request->end_date;
        $item->end_time = $request->end_time;
        $item->start_date_time = Carbon::parse($request->start_date . ' ' . $request->start_time)->format('Y-m-d H:i:s A');
        $item->end_date_time = Carbon::parse($request->end_date . ' ' . $request->end_time)->format('Y-m-d H:i:s A');
        $item->flash_percentage = $request->flash_percentage;
        $item->flash = 1;
        $item->save();
        Session::flash('success', __('Flash sale information set successfully') . '!');
        return "success";
    }


    public function flashRemove(Request $request)
    {
        $item = UserItem::findOrFail($request->itemId);
        $item->start_date = null;
        $item->start_time = null;
        $item->end_date = null;
        $item->end_time = null;
        $item->flash = null;
        $item->flash_percentage = null;
        $item->start_date_time = null;
        $item->end_date_time = null;
        $item->save();
        Session::flash('success', __('Item has been removed from flash sale') . '!');
        return "success";
    }
}
