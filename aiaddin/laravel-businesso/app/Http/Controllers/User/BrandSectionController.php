<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class BrandSectionController extends Controller
{
    public function brandSection(Request $request)
    {
        $user = Auth::guard('web')->user();

        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        // also, get the brand info of that language from db
        $information['brands'] = Brand::where('user_id', $user->id)
            ->orderBy('id', 'desc')
            ->get();

        return view('user.home.brand_section.index', $information);
    }

    public function storeBrand(Request $request)
    {
        $request->validate(
            [
                'brand_img' => 'required|mimes:jpeg,jpg,png|max:1000',
                'brand_url' => 'required',
                'serial_number' => 'required'
            ]);

        if ($request->hasFile('brand_img')) {
            $request['image_name'] = Uploader::upload_picture('assets/front/img/user/brands', $request->file('brand_img'));
        }
        Brand::create($request->except('brand_img', 'user_id') + [
            'user_id' => Auth::guard('web')->user()->id,
            'brand_img' => $request->image_name
        ]);

        $request->session()->flash('success', __('New brand added successfully') . '!');
        return 'success';
    }

    public function updateBrand(Request $request)
    {

        $brand = Brand::where('user_id', Auth::guard('web')->user()->id)->where('id', $request->brand_id)->firstOrFail();
        $rules = [
            'brand_url' => 'required',
            'serial_number' => 'required'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $request['image_name'] = $brand->brand_img;
        if ($request->hasFile('brand_img')) {
            $request['image_name'] = Uploader::update_picture('assets/front/img/user/brands', $request->file('brand_img'), $brand->brand_img);
        }
        $brand->update($request->except('brand_img') + [
            'brand_img' => $request->image_name
        ]);
        $request->session()->flash('success', __('Brand info updated successfully') . '!');
        return 'success';
    }

    public function deleteBrand(Request $request)
    {
        $brand = Brand::where('user_id', Auth::guard('web')->user()->id)->where('id', $request->brand_id)->firstOrFail();
        @unlink(public_path('assets/img/brands/' . $brand->brand_img));
        $brand->delete();
        $request->session()->flash('success', __('Brand deleted successfully') . '!');
        return redirect()->back();
    }
}
