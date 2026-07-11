<?php

namespace App\Http\Controllers\User\HotelBooking;

use App\Http\Controllers\Controller;
use App\Http\Controllers\User\MailTemplateController;
use App\Http\Helpers\UploadFile;
use App\Http\Requests\User\HoteBooking\RoomBookingRequest;
use App\Http\Requests\User\HotelBooking\CouponRequest;
use App\Http\Requests\User\HotelBooking\UserRoomBookingRequest;
use App\Models\User\BasicSetting;
use App\Models\User\HotelBooking\Coupon;
use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\HotelBooking\RoomCategory;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\Language;
use App\Models\User\UserEmailTemplate;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;

use Carbon\Carbon;
use DateTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use PDF;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

class RoomManagementController extends Controller
{
    use MiscellaneousTrait;
    public function settings()
    {
        $data = DB::table('user_room_settings')->select('room_rating_status', 'room_guest_checkout_status', 'room_category_status', 'is_room')
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();

        if (is_null($data)) {
            DB::table('user_room_settings')->insert(['user_id' => Auth::guard('web')->user()->id]);

            $data = DB::table('user_room_settings')->where('user_id', Auth::guard('web')->user()->id)
                ->first();
        }
        return view('user.rooms.settings', ['data' => $data]);
    }

    public function updateSettings(Request $request)
    {
        $rules = [
            'room_category_status' => 'required',
            'room_rating_status' => 'required',
            'room_guest_checkout_status' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        try {
            DB::table('user_room_settings')->where('user_id', Auth::guard('web')->user()->id)->update([
                'is_room' => $request->is_room,
                'room_category_status' => $request->room_category_status,
                'room_rating_status' => $request->room_rating_status,
                'room_guest_checkout_status' => $request->room_guest_checkout_status
            ]);

            session()->flash('success', __('Room settings updated successfully') . '!');

            return 'success';
        } catch (\Exception $e) {
            session()->flash('warning', __('Something went wrong') . '!');
            return 'success';
        }
    }


    public function coupons(Request $request)
    {
        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        // get the coupons from db
        $information['coupons'] = Coupon::where('user_id', $user->id)->orderByDesc('id')->get();

        // also, get the currency information from db
        $information['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);


        $rooms = Room::where('user_id', $user->id)->get();

        $rooms->map(function ($room) use ($lang) {
            $room['title'] = $room->roomContent()->where('language_id', $lang->id)->pluck('title')->first();
        });

        $information['rooms'] = $rooms;

        return view('user.rooms.coupon.coupons', $information);
    }

    public function storeCoupon(CouponRequest $request)
    {
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        if ($request->filled('rooms')) {
            $rooms = $request->rooms;
        }

        Coupon::create($request->except('start_date', 'end_date', 'rooms') + [
            'user_id' => Auth::guard('web')->user()->id,
            'start_date' => date_format($startDate, 'Y-m-d'),
            'end_date' => date_format($endDate, 'Y-m-d'),
            'rooms' => isset($rooms) ? json_encode($rooms) : null
        ]);

        session()->flash('success', __('New coupon added successfully') . '!');

        return 'success';
    }

    public function updateCoupon(CouponRequest $request)
    {
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        if ($request->filled('rooms')) {
            $rooms = $request->rooms;
        }

        Coupon::find($request->id)->update($request->except('start_date', 'end_date', 'rooms') + [
            'start_date' => date_format($startDate, 'Y-m-d'),
            'end_date' => date_format($endDate, 'Y-m-d'),
            'rooms' => isset($rooms) ? json_encode($rooms) : null
        ]);

        session()->flash('success', __('Coupon updated successfully') . '!');

        return 'success';
    }

    public function destroyCoupon($id)
    {
        Coupon::find($id)->delete();

        return redirect()->back()->with('success', __('Coupon deleted successfully') . '!');
    }


    public function amenities(Request $request)
    {
        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $information['language'] = $lang;


        // then, get the room amenities of that language from db
        $information['amenities'] = RoomAmenity::where([['language_id', $lang->id], ['user_id', $user->id]])
            ->orderBy('id', 'desc')
            ->get();

        // also, get all the languages from db
        $information['langs'] = Language::where('user_id', $user->id)->get();

        return view('user.rooms.amenity.amenities', $information);
    }

    public function storeAmenity(Request $request, $language)
    {
        $rules = [
            'user_language_id' => 'required',
            'name' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $language)->first();

        RoomAmenity::create($request->except('_token', 'user_language_id') + [
            'user_id' => $user->id,
            'language_id' => $request->user_language_id
        ]);

        session()->flash('success', __('New room amenity added successfully') . '!');

        return 'success';
    }

    public function updateAmenity(Request $request)
    {
        $rules = [
            'name' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        try {

            RoomAmenity::findOrFail($request->amenity_id)->update($request->except('_token', 'amenity_id'));
            session()->flash('success', __('Room amenity updated successfully') . '!');
        } catch (\Exception $e) {
            session()->flash('warning', $e->getMessage());
        }

        return 'success';
    }

    public function deleteAmenity(Request $request)
    {
        $rcs = RoomContent::where('user_id', Auth::guard()->user()->id)->get();

        foreach ($rcs as $rc) {

            $amis = json_decode($rc->amenities);
            foreach ($amis as $ami) {
                // dd($ami);
                if ($ami == $request->amenity_id) {
                    session()->flash('warning', __("You can\'t delete amenity it exixts in rooms") . '.');
                    return redirect()->back();
                }
            }
        }

        RoomAmenity::findOrFail($request->amenity_id)->delete();

        session()->flash('success', __('Room amenity deleted successfully') . '!');

        return redirect()->back();
    }

    public function bulkDeleteAmenity(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            RoomAmenity::findOrFail($id)->delete();
        }

        session()->flash('success', __('Room amenities deleted successfully') . '!');

        /**
         * this 'success' is returning for ajax call.
         * if return == 'success' then ajax will reload the page.
         */
        return 'success';
    }


    public function categories(Request $request)
    {
        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $information['language'] = $lang;
        // then, get the room categories of that language from db
        $information['roomCategories'] = RoomCategory::where([['language_id', $lang->id], ['user_id', $user->id]])
            ->orderBy('id', 'desc')
            ->paginate(10);

        // also, get all the languages from db
        $information['langs'] = Language::where('user_id', $user->id)->get();

        return view('user.rooms.categories.categories', $information);
    }

    public function storeCategory(Request $request, $language)
    {
        $rules = [
            'name' => 'required',
            'user_language_id' => 'required',
            'status' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        $user = Auth::guard('web')->user();


        RoomCategory::create($request->except('user_language_id') + [
            'language_id' => $request->user_language_id,
            'user_id' => $user->id
        ]);

        session()->flash('success', __('New room category added successfully') . '!');

        return 'success';
    }

    public function updateCategory(Request $request)
    {
        $rules = [
            'name' => 'required',
            'status' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        RoomCategory::findOrFail($request->category_id)->update($request->except('_token', 'category_id'));

        session()->flash('success', __('Room category updated successfully') . '!');

        return 'success';
    }

    public function deleteCategory(Request $request)
    {

        $roomCategory = RoomCategory::findOrFail($request->category_id);

        if ($roomCategory->roomContentList()->count() > 0) {
            session()->flash('warning', __('First delete all the rooms of this category') . '!');

            return redirect()->back();
        }

        $roomCategory->delete();

        session()->flash('success', __('Room category deleted successfully') . '!');

        return redirect()->back();
    }

    public function bulkDeleteCategory(Request $request)
    {

        $ids = $request->ids;

        foreach ($ids as $id) {
            $roomCategory = RoomCategory::findOrFail($id);

            if ($roomCategory->roomContentList()->count() > 0) {
                session()->flash('warning', __('First delete all the rooms of those category') . '!');

                /**
                 * this 'success' is returning for ajax call.
                 * here, by returning the 'success' ajax will show the flash error message
                 */
                return 'success';
            }

            $roomCategory->delete();
        }

        session()->flash('success', __('Room categories deleted successfully') . '!');

        /**
         * this 'success' is returning for ajax call.
         * if return == 'success' then ajax will reload the page.
         */
        return 'success';
    }


    public function rooms(Request $request)
    {
        $setting = DB::table('user_room_settings')->select('room_rating_status', 'room_guest_checkout_status', 'room_category_status')
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();

        if (is_null($setting)) {
            DB::table('user_room_settings')->insert(['user_id' => Auth::guard('web')->user()->id]);

            $setting = DB::table('user_room_settings')->where('user_id', Auth::guard('web')->user()->id)
                ->first();
        }


        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        // $languageId = Language::where('dashboard_default', 1)->pluck('id')->first();

        $roomContents = RoomContent::with('room')
            ->where([['language_id', '=', $lang->id], ['user_id', $user->id]])
            ->orderBy('room_id', 'desc')
            ->get();

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        return view('user.rooms.rooms', compact('roomContents', 'currencyInfo'));
    }

    public function createRoom()
    {
        // get all the languages from db
        $information['languages'] = Language::where('user_id', Auth::guard()->user()->id)->get();
        $information['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo(Auth::guard()->user()->id);
        return view('user.rooms.create_room', $information);
    }
    /**
     * Store a new slider image in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function uploadSliderImage(Request $request)
    {

        $rule = [
            'slider_image' => 'required|mimes:png,jpeg,gif,jpg'
        ];

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()
            ], 400);
        }

        $imageName = UploadFile::store('assets/img/rooms/slider-images/', $request->file('slider_image'));

        return Response::json(['uniqueName' => $imageName], 200);
    }
    /**
     * Remove a slider image from storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function removeSliderImage(Request $request)
    {
        $img = $request['imageName'];

        try {
            @unlink(public_path('assets/img/rooms/slider-images/' . $img));

            return Response::json(['success' => __('The image has been deleted') . '.'], 200);
        } catch (\Exception $e) {
            return Response::json(['error' => __('Something went wrong') . '!'], 400);
        }
    }

    /**
     * Remove 'stored' slider image form storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function detachImage(Request $request)
    {
        $id = $request['id'];
        $key = $request['key'];

        $room = Room::query()->find($id);

        $sliderImages = json_decode($room->slider_imgs);

        if (count($sliderImages) == 1) {
            return Response::json(['message' => __('Sorry, the last image cannot be delete') . '.'], 400);
        } else {
            $image = $sliderImages[$key];

            @unlink(public_path('assets/img/rooms/slider-images/' . $image));

            array_splice($sliderImages, $key, 1);

            $room->update([
                'slider_imgs' => json_encode($sliderImages)
            ]);

            return Response::json(['message' => __('Slider image removed successfully') . '!'], 200);
        }
    }

    public function storeRoom(Request $request)
    {
        $rules = [
            'slider_images' => 'required',
            'featured_img' => 'required|mimes:png,jpeg,gif,jpg',
            'status' => 'required',
            'rent' => 'required',
            'quantity' => 'required|numeric',
            'bed' => 'required',
            'bath' => 'required',
            'max_guests' => 'nullable|numeric',
        ];

        $user = Auth::guard('web')->user();
        $languages = Language::where('user_id', $user->id)->get();
        $bs = DB::table('user_room_settings')->where('user_id', $user->id)->select('room_category_status')->first();

        foreach ($languages as $language) {
            $rules[$language->code . '_title'] = 'required|max:255';

            if ($bs->room_category_status == 1) {
                $rules[$language->code . '_category'] = 'required';
            }
            $rules[$language->code . '_summary'] = 'required';
            $rules[$language->code . '_description'] = 'required|min:15';

            $messages[$language->code . '_title.required'] = __('The Title field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_title.max'] = __('The title field cannot contain more than 255 characters for') . ' ' . $language->name . ' language';

            $messages[$language->code . '_category.required'] = __('The Category field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_summary.required'] = __('The summary field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_description.required'] = __('The description field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_description.min'] = __('The description field atleast have 15 characters for') . ' ' . $language->name . ' ' . __('language') . '.';
        }

        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        $featuredImgName  = UploadFile::store('assets/img/rooms/feature-images/', $request->file('featured_img'));
        DB::beginTransaction();
        try {
            $room = new Room();
            $room->user_id = $user->id;
            $room->slider_imgs = json_encode($request->slider_images);
            $room->featured_img = $featuredImgName;
            $room->status = $request->status;
            $room->bed = $request->bed;
            $room->bath = $request->bath;
            $room->rent = $request->rent;
            $room->max_guests = $request->max_guests;
            $room->latitude = $request->latitude;
            $room->longitude = $request->longitude;
            $room->address = $request->address;
            $room->phone = $request->phone;
            $room->email = $request->email;
            $room->quantity = $request->quantity;
            $room->save();

            foreach ($languages as $language) {
                $roomContent = new RoomContent();
                $roomContent->user_id = $user->id;
                $roomContent->language_id = $language->id;
                if ($bs->room_category_status == 1) {
                    $roomContent->room_category_id = $request[$language->code . '_category'];
                }
                $roomContent->room_id = $room->id;
                $roomContent->title = $request[$language->code . '_title'];
                $roomContent->slug = make_slug($request[$language->code . '_title']);
                $roomContent->amenities = json_encode($request[$language->code . '_amenities']);
                $roomContent->summary = $request[$language->code . '_summary'];
                $roomContent->description = clean($request[$language->code . '_description']);
                $roomContent->meta_keywords = $request[$language->code . '_meta_keywords'];
                $roomContent->meta_description = $request[$language->code . '_meta_description'];
                $roomContent->save();
            }
            DB::commit();
            session()->flash('success', __('New room added successfully') . '!');
        } catch (\Exception $e) {
            DB::rollback();
            session()->flash('warning', $e->getMessage());
            return Response::json([
                'exception' =>  $e->getMessage()
            ], 400);
        }
        return 'success';
    }

    public function updateFeaturedRoom(Request $request)
    {
        $room = Room::findOrfail($request->roomId);
        if ($room->status == 1) {

            if ($request->is_featured == 1) {

                $room->update(['is_featured' => 1]);

                session()->flash('success', __('Room featured successfully') . '!');
            } else {
                $room->update(['is_featured' => 0]);

                session()->flash('success', __('Room unfeatured successfully') . '!');
            }
        } else {
            session()->flash('warning', __('Please change your room status first') . '.');
        }
        return redirect()->back();
    }

    public function editRoom($id)
    {
        $user = Auth::guard('web')->user();
        // get all the languages from db
        $information['languages'] = Language::where('user_id', $user->id)->get();

        $information['room'] = Room::findOrfail($id);

        return view('user.rooms.edit_room', $information);
    }

    public function getSliderImages($id)
    {
        $room = Room::findOrFail($id);
        $sliderImages = json_decode($room->slider_imgs);

        $images = [];

        // concatanate slider image with image location
        foreach ($sliderImages as $key => $sliderImage) {
            $data = public_path('assets/img/rooms/slider_images/' . $sliderImage);
            array_push($images, $data);
        }

        return Response::json($images, 200);
    }

    public function updateRoom(Request $request, $id)
    {
        $rules = [
            'status' => 'required',
            'bed' => 'required',
            'bath' => 'required',
            'rent' => 'required',
            'max_guests' => 'nullable|numeric',
            'quantity' => 'required|numeric'
        ];

        $featuredImgURL = $request->featured_img;

        $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');
        $featuredImgExt = pathinfo($featuredImgURL, PATHINFO_EXTENSION);



        if ($request->filled('featured_img')) {
            $rules['featured_img'] = function ($attribute, $value, $fail) use ($allowedExtensions, $featuredImgExt) {
                if (!in_array($featuredImgExt, $allowedExtensions)) {
                    $fail(__('Only .jpg, .jpeg, .png and .svg file is allowed for featured image') . '.');
                }
            };
        }


        $user = Auth::guard('web')->user();

        $languages = Language::where('user_id', $user->id)->get();
        $bs = DB::table('user_room_settings')->where('user_id', $user->id)->select('room_category_status')->first();

        foreach ($languages as $language) {
            $rules[$language->code . '_title'] = 'required|max:255';
            if ($bs->room_category_status == 1) {
                $rules[$language->code . '_category'] = 'required';
            }
            $rules[$language->code . '_summary'] = 'required';
            $rules[$language->code . '_description'] = 'required|min:15';

            $messages[$language->code . '_title.required'] = __('The title field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_title.max'] = __('The title field cannot contain more than 255 characters for') . ' ' . $language->name . ' ' . __('language') . '.';

            if ($bs->room_category_status == 1) {
                $messages[$language->code . '_category.required'] = __('The category field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            }

            $messages[$language->code . '_summary.required'] = __('The summary field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_description.required'] = __('The description field is required for') . ' ' . $language->name . ' ' . __('language') . '.';

            $messages[$language->code . '_description.min'] = __('The description field atleast have 15 characters for') . ' ' . $language->name . ' ' . __('language') . '.';
        }

        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $room = Room::findOrFail($id);

        $roomSldImgs = json_decode($room->slider_imgs);


        // merge slider images with existing images if request has new slider image
        if ($request->filled('slider_images')) {
            $prevImages = json_decode($room->slider_imgs);
            $newImages = $request['slider_images'];
            $imgArr = array_merge($prevImages, $newImages);
        }


        if ($request->hasFile('featured_img')) {
            $newImage = $request->file('featured_img');
            $oldImage = $room->featured_img;

            $featureImage = UploadFile::update('assets/img/rooms/feature-images/', $newImage, $oldImage);
        }
        $room->update([
            'slider_imgs' =>  isset($imgArr) ?  json_encode($imgArr) : $roomSldImgs,
            'featured_img' => $request->hasFile('featured_img') ? $featureImage : $room->featured_img,
            'status' => $request->status,
            'bed' => $request->bed,
            'bath' => $request->bath,
            'rent' => $request->rent,
            'max_guests' => $request->max_guests,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'address' => $request->address,
            'phone' => $request->phone,
            'email' => $request->email,
            'quantity' => $request->quantity
        ]);

        foreach ($languages as $language) {
            $roomContent = RoomContent::where('room_id', $id)
                ->where('language_id', $language->id)
                ->first();

            $content = [
                'language_id' => $language->id,
                'user_id' => $user->id,
                'room_id' => $id,
                'room_category_id' => $bs->room_category_status == 1 ? $request[$language->code . '_category'] : $roomContent->room_category_id,
                'title' => $request[$language->code . '_title'],
                'slug' => make_slug($request[$language->code . '_title']),
                'amenities' => json_encode($request[$language->code . '_amenities']),
                'summary' => $request[$language->code . '_summary'],
                'description' => clean($request[$language->code . '_description']),
                'meta_keywords' => $request[$language->code . '_meta_keywords'],
                'meta_description' => $request[$language->code . '_meta_description']
            ];

            if (!empty($roomContent)) {
                $roomContent->update($content);
            } else {
                RoomContent::create($content);
            }
        }

        session()->flash('success', __('Room updated successfully') . '!');

        return 'success';
    }

    public function deleteRoom(Request $request)
    {
        $room = Room::findOrFail($request->room_id);

        if ($room->roomBookings()->count()) {
            $room->update([
                'status' => 0,
                'is_featured' => 0
            ]);
            session()->flash("warning", __("Room can't delete. But hide from every where") . ".");
        } else {
            if ($room->roomContent()->count()) {
                $contents = $room->roomContent()->delete();
            }
            if (!is_null($room->slider_imgs)) {
                $images = json_decode($room->slider_imgs);

                foreach ($images as $image) {
                    if (file_exists(public_path('assets/img/rooms/slider_images/' . $image))) {
                        unlink(public_path('assets/img/rooms/slider_images/' . $image));
                    }
                }
            }
            if (!is_null($room->featured_img) && file_exists(public_path('assets/img/rooms/' . $room->featured_img))) {
                unlink(public_path('assets/img/rooms/' . $room->featured_img));
            }

            $room->delete();
            session()->flash('success', __('Room deleted successfully') . '!');
        }


        return redirect()->back();
    }

    public function bulkDeleteRoom(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {

            $room = Room::findOrFail($id);

            if ($room->roomBookings()->count()) {
                $room->update([
                    'status' => 0,
                    'is_featured' => 0
                ]);
                session()->flash("warning", __("Room can't delete. But hide from every where") . ".");
            } else {
                if ($room->roomContent()->count()) {
                    $contents = $room->roomContent()->delete();
                }
                if (!is_null($room->slider_imgs)) {
                    $images = json_decode($room->slider_imgs);

                    foreach ($images as $image) {
                        if (file_exists(public_path('assets/img/rooms/slider_images/' . $image))) {
                            unlink(public_path('assets/img/rooms/slider_images/' . $image));
                        }
                    }
                }
                if (!is_null($room->featured_img) && file_exists(public_path('assets/img/rooms/' . $room->featured_img))) {
                    unlink(public_path('assets/img/rooms/' . $room->featured_img));
                }

                $room->delete();
                session()->flash('success', __('Room deleted successfully') . '!');
            }
        }

        /**
         * this 'success' is returning for ajax call.
         * if return == 'success' then ajax will reload the page.
         */
        return 'success';
    }


    public function bookings(Request $request)
    {
        $booking_number = null;
        $user = Auth::guard('web')->user();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        if ($request->filled('booking_no')) {
            $booking_number = $request['booking_no'];
        }

        if (URL::current() == $request->routeIs('user.room_bookings.all_bookings')) {
            $queryResult['bookings'] = RoomBooking::where('user_id', $user->id)->when($booking_number, function ($query, $booking_number) {
                return $query->where('booking_number', 'like', '%' . $booking_number . '%');
            })->orderBy('id', 'desc')
                ->paginate(10);
        } else if (URL::current() == $request->routeIs('user.room_bookings.paid_bookings')) {
            $queryResult['bookings'] = RoomBooking::where('user_id', $user->id)->when($booking_number, function ($query, $booking_number) {
                return $query->where('booking_number', 'like', '%' . $booking_number . '%');
            })->where('payment_status', 1)
                ->orderBy('id', 'desc')
                ->paginate(10);
        } else if (URL::current() == $request->routeIs('user.room_bookings.unpaid_bookings')) {
            $queryResult['bookings'] = RoomBooking::where('user_id', $user->id)->when($booking_number, function ($query, $booking_number) {
                return $query->where('booking_number', 'like', '%' . $booking_number . '%');
            })->where('payment_status', 0)
                ->orderBy('id', 'desc')
                ->paginate(10);
        }

        // $language = Language::query()->where('dashboard_default', '=', 1)->first();

        $queryResult['roomInfos'] = $lang->roomDetails()->whereHas('room', function (Builder $query) {
            $query->where('status', '=', 1);
        })
            ->select('room_id', 'title')
            ->orderBy('title', 'ASC')
            ->get();

        return view('user.rooms.booking.bookings', $queryResult);
    }

    public function updatePaymentStatus(Request $request)
    {
        // dd($request->all());
        $roomBooking = RoomBooking::findOrFail($request->booking_id);

        if ($request->payment_status == 1) {
            $roomBooking->update(['payment_status' => 1]);
        } else {
            $roomBooking->update(['payment_status' => 0]);
        }

        // delete previous invoice from local storage
        if (
            !is_null($roomBooking->invoice) &&
            file_exists(public_path('assets/invoices/rooms/' . $roomBooking->invoice))
        ) {
            unlink(public_path('assets/invoices/rooms/' . $roomBooking->invoice));
        }

        // then, generate an invoice in pdf format
        $invoice = $this->generateInvoice($roomBooking);

        // update the invoice field information in database
        $roomBooking->update(['invoice' => $invoice]);

        // finally, send a mail to the customer with the invoice
        $this->sendMailForPaymentStatus($roomBooking, $request->payment_status);

        session()->flash('success', __('Payment status updated successfully') . '!');

        return redirect()->back();
    }

    public function editBookingDetails($id)
    {
        $details = RoomBooking::findOrFail($id);
        $queryResult['details'] = $details;
        $user  = Auth::guard('web')->user();
        // get the difference of two dates, date should be in 'YYYY-MM-DD' format
        $date1 = new DateTime($details->arrival_date);
        $date2 = new DateTime($details->departure_date);
        $queryResult['interval'] = $date1->diff($date2, true);

        $language = Language::where([['dashboard_default', 1], ['user_id', $user->id]])->first();

        /**
         * to get the room title first get the room info using eloquent relationship
         * then, get the room content info of that room using eloquent relationship
         * after that, we can access the room title
         * also, get the room category using eloquent relationship
         */
        $roomInfo = $details->hotelRoom()->first();

        $roomContentInfo = $roomInfo->roomContent()->where('language_id', $language->id)->first();
        // dd($roomContentInfo, $language);
        $queryResult['roomTitle'] = $roomContentInfo->title;

        $roomCategoryInfo = $roomContentInfo->roomCategory()->first();
        $queryResult['roomCategoryName'] = $roomCategoryInfo->name;

        // get all the booked dates of this room
        $roomId = $details->room_id;
        $detailsId = $details->id;

        $queryResult['bookedDates'] = $this->getBookedDatesOfRoom($roomId, $detailsId);

        $queryResult['onlineGateways'] = UserPaymentGeteway::query()
            ->where('user_id', $user->id)
            ->where('status', '=', 1)
            ->select('name')
            ->get();

        $queryResult['offlineGateways'] = UserOfflineGateway::query()
            ->where('item_checkout_status', '=', 1)
            ->where('user_id', $user->id)
            ->select('name')
            ->orderBy('serial_number', 'asc')
            ->get();

        $queryResult['rent'] = $roomInfo->rent;

        return view('user.rooms.booking.booking_details', $queryResult);
    }

    public function updateBooking(UserRoomBookingRequest $request)
    {

        $user = Auth::guard('web')->user();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        // update the room booking information in database
        $dateArray = explode(' ', $request->dates);

        $onlinePaymentGateway = ['PayPal', 'Stripe', 'Instamojo', 'Paystack', 'Flutterwave', 'Razorpay', 'MercadoPago', 'Mollie', 'Paytm', 'Authorize.net'];

        $gatewayType = in_array($request->payment_method, $onlinePaymentGateway) ? 'online' : 'offline';

        $booking = RoomBooking::query()->findOrFail($request->booking_id);

        $booking->update([
            'customer_name' => $request->customer_name,
            'customer_email' => $request->customer_email,
            'customer_phone' => $request->customer_phone,
            'arrival_date' => $dateArray[0],
            'departure_date' => $dateArray[2],
            'guests' => $request->guests,
            'subtotal' => $request->subtotal,
            'discount' => $request->discount,
            'grand_total' => $request->total,
            'currency_symbol' => $currencyInfo->base_currency_symbol,
            'currency_symbol_position' => $currencyInfo->base_currency_symbol_position,
            'currency_text' => $currencyInfo->base_currency_text,
            'currency_text_position' => $currencyInfo->base_currency_text_position ?? $currencyInfo->base_currency_symbol_position,
            'payment_method' => $request->payment_method,
            'gateway_type' => $gatewayType,
            'payment_status' => $request->payment_status
        ]);

        session()->flash('success', __('Booking information has updated') . '.');

        return redirect()->back();
    }

    public function sendMail(Request $request)
    {
        $rules = [
            'subject' => 'required',
            'message' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $mailInfo = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_username', 'smtp_password', 'from_mail')
            ->first();
        $bs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('website_title', 'from_name', 'email')->firstOrFail();

        if (is_null($bs->email) || is_null($bs->from_name)) {
            session()->flash('warning', __("Please set/update your mail information") . '.');
            return 'success';
        }

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8"; 
        // if smtp status == 1, then set some value for PHPMailer
        if ($mailInfo->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host       = $mailInfo->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $mailInfo->smtp_username;
            $mail->Password   = $mailInfo->smtp_password;

            // if ($mailInfo->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }

            // $mail->Port       = $mailInfo->smtp_port;
            $mail->Port       = 587;
        }

        // finally add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($mailInfo->from_mail, $bs->from_name);
            $mail->addAddress($request->customer_email);
            $mail->AddReplyTo($bs->email);
            // Content
            $mail->isHTML(true);
            $mail->Subject = $request->subject;
            $mail->Body    = clean($request->message);

            $mail->send();
            session()->flash('success', __("Mail has been sent") . '!');

            /**
             * this 'success' is returning for ajax call.
             * if return == 'success' then ajax will reload the page.
             */
            return 'success';
        } catch (\Exception $e) {
            // session()->flash('warning', 'Mail could not be sent!');
            session()->flash('warning', $e->getMessage());

            /**
             * this 'success' is returning for ajax call.
             * if return == 'success' then ajax will reload the page.
             */
            return 'success';
        }
    }

    public function deleteBooking(Request $request, $id)
    {
        $roomBooking = RoomBooking::findOrFail($id);

        // first, delete the attachment
        if (
            !is_null($roomBooking->attachment) &&
            file_exists(public_path('assets/img/attachments/rooms/' . $roomBooking->attachment))
        ) {
            unlink(public_path('assets/img/attachments/rooms/' . $roomBooking->attachment));
        }

        // second, delete the invoice
        if (
            !is_null($roomBooking->invoice) &&
            file_exists(public_path('assets/invoices/rooms/' . $roomBooking->invoice))
        ) {
            unlink(public_path('assets/invoices/rooms/' . $roomBooking->invoice));
        }

        // finally, delete the room booking record from db
        $roomBooking->delete();

        session()->flash('success', __('Room booking record deleted successfully') . '!');

        return redirect()->back();
    }

    public function bulkDeleteBooking(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            $roomBooking = RoomBooking::findOrFail($id);

            // first, delete the attachment
            if (
                !is_null($roomBooking->attachment) &&
                file_exists(public_path('assets/img/attachments/rooms/' . $roomBooking->attachment))
            ) {
                unlink(public_path('assets/img/attachments/rooms/' . $roomBooking->attachment));
            }

            // second, delete the invoice
            if (
                !is_null($roomBooking->invoice) &&
                file_exists(public_path('assets/invoices/rooms/' . $roomBooking->invoice))
            ) {
                unlink(public_path('assets/invoices/rooms/' . $roomBooking->invoice));
            }

            // finally, delete the room booking record from db
            $roomBooking->delete();
        }

        session()->flash('success', __("Room booking records deleted successfully") . '!');

        /**
         * this 'success' is returning for ajax call.
         * if return == 'success' then ajax will reload the page.
         */
        return 'success';
    }


    private function generateInvoice($bookingInfo)
    {

        $fileName = $bookingInfo->booking_number . '.pdf';
        $directory = public_path('/assets/invoices/rooms/');

        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }
        $currentLanguageInfo = Language::where('is_default', 1)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $fileLocated = $directory . $fileName;

        PDF::loadView('user.rooms.pdf.room_booking', compact('bookingInfo', 'currentLanguageInfo'))->save($fileLocated);

        return $fileName;
    }

    private function sendMailForPaymentStatus($roomBooking, $status)
    {
        // first get the mail template information from db
        if ($status == 1) {
            $mailTemplate = UserEmailTemplate::where('user_id', Auth::guard('web')->user()->id)->where('email_type', 'payment_received')->firstOrFail();
        } else {
            $mailTemplate = UserEmailTemplate::where('email_type', 'payment_cancelled')->firstOrFail();
        }
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = $mailTemplate->email_body;

        // second get the website title & mail's smtp information from db
        $info = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_username', 'smtp_password', 'from_mail')
            ->first();
        $bs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('website_title', 'from_name', 'email')->firstOrFail();

        // replace template's curly-brace string with actual data
        $mailBody = str_replace('{customer_name}', $roomBooking->customer_name, $mailBody);
        $mailBody = str_replace('{website_title}', $bs->website_title, $mailBody);

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8"; 
        // if smtp status == 1, then set some value for PHPMailer
        if ($info->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host       = $info->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $info->smtp_username;
            $mail->Password   = $info->smtp_password;

            // if ($info->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }

            $mail->Port       = 587;
        }

        // finally add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($info->from_mail, $bs->from_name);
            $mail->addAddress($roomBooking->customer_email);
            $mail->AddReplyTo($bs->email);
            // Attachments (Invoice)
            $mail->addAttachment(public_path('assets/invoices/rooms/' . $roomBooking->invoice));

            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body    = $mailBody;

            $mail->send();

            return;
        } catch (Exception $e) {
            return redirect()->back()->with('warning', __('Mail could not be sent') . '!');
        }
    }


    // room booking from admin panel
    public function bookedDates(Request $request)
    {
        $rule = [
            'room_id' => 'required'
        ];

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->getMessageBag()
            ]);
        }

        // get all the booked dates of the selected room
        $roomId = $request['room_id'];

        $bookedDates = $this->getBookedDatesOfRoom($roomId);

        $request->session()->put('bookedDates', $bookedDates);

        return response()->json([
            'success' => route('user.room_bookings.booking_form', ['room_id' => $roomId])
        ]);
    }

    public function getBookedDatesOfRoom($id, $bookingId = null)
    {
        $quantity = Room::query()->findOrFail($id)->quantity;

        $bookings = RoomBooking::query()->where('room_id', '=', $id)
            ->where('payment_status', '=', 1)
            ->select('arrival_date', 'departure_date')
            ->get();

        $bookedDates = [];

        foreach ($bookings as $booking) {
            // get all the dates between the booking arrival date & booking departure date
            $date_1 = $booking->arrival_date;
            $date_2 = $booking->departure_date;

            $allDates = $this->getAllDates($date_1, $date_2, 'Y-m-d');

            // loop through the list of dates, which we have found from the booking arrival date & booking departure date
            foreach ($allDates as $date) {
                $bookingCount = 0;

                // loop through all the bookings
                foreach ($bookings as $currentBooking) {
                    $bookingStartDate = Carbon::parse($currentBooking->arrival_date);
                    $bookingEndDate = Carbon::parse($currentBooking->departure_date);
                    $currentDate = Carbon::parse($date);

                    // check for each date, whether the date is present or not in any of the booking date range
                    if ($currentDate->betweenIncluded($bookingStartDate, $bookingEndDate)) {
                        $bookingCount++;
                    }
                }

                // if the number of booking of a specific date is same as the room quantity, then mark that date as unavailable
                if ($bookingCount >= $quantity && !in_array($date, $bookedDates)) {
                    array_push($bookedDates, $date);
                }
            }
        }

        if (is_null($bookingId)) {
            return $bookedDates;
        } else {
            $booking = RoomBooking::query()->findOrFail($bookingId);
            $arrivalDate = $booking->arrival_date;
            $departureDate = $booking->departure_date;

            // get all the dates between the booking arrival date & booking departure date
            $bookingAllDates = $this->getAllDates($arrivalDate, $departureDate, 'Y-m-d');

            // remove dates of this booking from 'bookedDates' array while editing a room booking
            foreach ($bookingAllDates as $date) {
                $key = array_search($date, $bookedDates);

                if ($key !== false) {
                    unset($bookedDates[$key]);
                }
            }

            return array_values($bookedDates);
        }
    }

    public function getAllDates($startDate, $endDate, $format)
    {
        $dates = [];

        // convert string to timestamps
        $currentTimestamps = strtotime($startDate);
        $endTimestamps = strtotime($endDate);

        // set an increment value
        $stepValue = '+1 day';

        // push all the timestamps to the 'dates' array by formatting those timestamps into date
        while ($currentTimestamps <= $endTimestamps) {
            $formattedDate = date($format, $currentTimestamps);
            array_push($dates, $formattedDate);
            $currentTimestamps = strtotime($stepValue, $currentTimestamps);
        }

        return $dates;
    }

    public function bookingForm(Request $request)
    {
        if ($request->session()->has('bookedDates')) {
            $queryResult['dates'] = $request->session()->get('bookedDates');
        } else {
            $queryResult['dates'] = [];
        }
        $user = Auth::guard('web')->user();
        $id = $request['room_id'];
        $queryResult['id'] = $id;

        $room = Room::query()->find($id);
        $queryResult['rent'] = $room->rent;

        $queryResult['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);

        $queryResult['onlineGateways'] = UserPaymentGeteway::where('user_id', $user->id)
            ->where('status', '=', 1)
            ->select('name')
            ->get();

        $queryResult['offlineGateways'] = UserOfflineGateway::where('user_id', $user->id)
            // ->where('room_booking_status', '=', 1)
            ->select('name')
            ->orderBy('serial_number', 'asc')
            ->get();

        return view('user.rooms.booking.booking_form', $queryResult);
    }

    public function makeBooking(RoomBookingRequest $request)
    {
        $user = Auth::guard('web')->user();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        // store the room booking information in database
        $dateArray = explode(' ', $request->dates);

        $onlinePaymentGateway = ['PayPal', 'Stripe', 'Instamojo', 'Paystack', 'Flutterwave', 'Razorpay', 'MercadoPago', 'Mollie', 'Paytm'];

        $gatewayType = in_array($request->payment_method, $onlinePaymentGateway) ? 'online' : 'offline';

        $bookingInfo = RoomBooking::query()->create([
            'booking_number' => time(),
            'user_id' => $user->id,
            'customer_id' => null,
            'customer_name' => $request->customer_name,
            'customer_email' => $request->customer_email,
            'customer_phone' => $request->customer_phone,
            'room_id' => $request->room_id,
            'arrival_date' => $dateArray[0],
            'departure_date' => $dateArray[2],
            'guests' => $request->guests,
            'subtotal' => $request->subtotal,
            'discount' => $request->discount,
            'grand_total' => $request->total,
            'currency_symbol' => $currencyInfo->base_currency_symbol,
            'currency_symbol_position' => $currencyInfo->base_currency_symbol_position,
            'currency_text' => $currencyInfo->base_currency_text,
            'currency_text_position' => $currencyInfo->base_currency_text_position ?? 'left',
            'payment_method' => $request->payment_method,
            'gateway_type' => $gatewayType,
            'payment_status' => $request->payment_status
        ]);

        if ($request->payment_status == 1) {
            // generate an invoice in pdf format
            $invoice = $this->generateInvoice($bookingInfo);

            // update the invoice field information in database
            $bookingInfo->update(['invoice' => $invoice]);

            // send a mail to the customer with an invoice
            $this->sendMailForRoomBooking($bookingInfo);
        }

        session()->flash('success', __('Room has booked') . '.');

        return redirect()->back();
    }

    public function sendMailForRoomBooking($bookingInfo)
    {
        // first get the mail template information from db
        // MailTemplateController::class;
        $user = Auth::guard('web')->user();
        $mailTemplate = UserEmailTemplate::where('user_id', $user->id)->where('email_type', '=', 'room_booking')->first();
        $mailSubject = $mailTemplate->mail_subject;
        $mailBody = replaceBaseUrl($mailTemplate->mail_body, 'summernote');

        // second get the website title & mail's smtp information from db
        $info = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_port', 'encryption', 'smtp_username', 'smtp_password', 'from_mail')
            ->first();
        $webinfo = DB::table('user_basic_settings')->where('user_id', $user->id)->select(
            'from_name',
            'email',
            'website_title'
        )->first();



        // get the difference of two dates, date should be in 'YYYY-MM-DD' format
        $date1 = new DateTime($bookingInfo->arrival_date);
        $date2 = new DateTime($bookingInfo->departure_date);
        $interval = $date1->diff($date2, true);

        // get the room category name according to language
        $language = Language::where('user_id', $user->id)->where('dashboard_default', '=', 1)->first();

        $roomContent = RoomContent::query()->where('language_id', '=', $language->id)
            ->where('room_id', '=', $bookingInfo->room_id)
            ->first();

        $roomCategoryName = $roomContent->roomCategory->name;

        $roomRent = ($bookingInfo->currency_text_position == 'left' ? $bookingInfo->currency_text . ' ' : '') . $bookingInfo->grand_total . ($bookingInfo->currency_text_position == 'right' ? ' ' . $bookingInfo->currency_text : '');

        // get the amenities of booked room
        $amenityIds = json_decode($roomContent->amenities);

        $amenityArray = [];

        foreach ($amenityIds as $id) {
            $amenity = RoomAmenity::query()->findOrFail($id);
            array_push($amenityArray, $amenity->name);
        }

        // now, convert amenity array into comma separated string
        $amenityString = implode(', ', $amenityArray);

        // replace template's curly-brace string with actual data
        $mailBody = str_replace('{customer_name}', $bookingInfo->customer_name, $mailBody);
        $mailBody = str_replace('{room_name}', $roomContent->title, $mailBody);
        $mailBody = str_replace('{room_rent}', $roomRent, $mailBody);
        $mailBody = str_replace('{booking_number}', $bookingInfo->booking_number, $mailBody);
        $mailBody = str_replace('{booking_date}', date_format($bookingInfo->created_at, 'F d, Y'), $mailBody);
        $mailBody = str_replace('{number_of_night}', $interval->days, $mailBody);
        $mailBody = str_replace('{website_title}', $webinfo->website_title, $mailBody);
        $mailBody = str_replace('{check_in_date}', $bookingInfo->arrival_date, $mailBody);
        $mailBody = str_replace('{check_out_date}', $bookingInfo->departure_date, $mailBody);
        $mailBody = str_replace('{number_of_guests}', $bookingInfo->guests, $mailBody);
        $mailBody = str_replace('{room_type}', $roomCategoryName, $mailBody);
        $mailBody = str_replace('{room_amenities}', $amenityString, $mailBody);

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8"; 
        // if smtp status == 1, then set some value for PHPMailer
        if ($info->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host       = $info->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $info->smtp_username;
            $mail->Password   = $info->smtp_password;

            if ($info->encryption == 'TLS') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mail->Port       = $info->smtp_port;
        }

        // finally add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($info->from_mail, $webinfo->from_name);
            $mail->addAddress($bookingInfo->customer_email);

            // Attachments (Invoice)
            $mail->addAttachment(public_path('assets/invoices/rooms/' . $bookingInfo->invoice));

            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body    = $mailBody;

            $mail->send();

            return;
        } catch (Exception $e) {
            return;
        }
    }
}
