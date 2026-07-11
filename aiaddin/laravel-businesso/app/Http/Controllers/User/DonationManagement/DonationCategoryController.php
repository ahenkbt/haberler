<?php

namespace App\Http\Controllers\User\DonationManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\BasicSetting;
use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DonationCategoryController extends Controller
{
    public function index(Request $request)
    {
        $information['langs'] = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['language'] = $information['langs']->where('code', $request->language)->first();
        $information['categories'] = DonationCategories::where([['language_id', $information['language']->id], ['user_id', Auth::guard('web')->user()->id]])->orderBy('serial_number', 'DESC')->paginate(10);
        return view('user.donation_management.categories.index', $information);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('web')->user();
        $userBs = BasicSetting::query()->select('theme')->where('user_id', $user->id)->first();
        $request->validate(
            [
                'name' => 'required',
                'user_language_id' => 'required',
                'short_description' => 'required',
                'image' => 'required|image|mimes:jpg,png,jpeg,svg',
                'icon' => 'required',
                'status' => 'required',
                'is_featured' => Rule::requiredIf($userBs->theme == 'home_eleven'),
                'serial_number' => 'required'
            ]
        );

        $imageName = '';
        if ($request->hasFile('image')) {

            $imageName =  Uploader::upload_picture(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE, $request->image);
        }

        DonationCategories::create($request->except('_token', 'image', 'user_language_id') + [
            'language_id' => $request->user_language_id,
            'user_id' => $user->id,
            'image' => $imageName ?? null,
            'slug' => make_slug($request->name)
        ]);

        session()->flash('success', __('Donation category added successfully') . '!');

        return 'success';
    }

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'short_description' => 'required',
            'image' => 'image|mimes:jpg,png,jpeg,svg',
            'status' => 'required',

            'serial_number' => 'required'
        ]);

        $imageName = '';
        if ($request->hasFile('image')) {

            $imageName =  Uploader::upload_picture(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE, $request->image);
        }

        $category = DonationCategories::find($request->category_id);
        $category->update($request->except('category_id', 'image') + [
            'image' => $imageName != '' ? $imageName : $category->image,
            'slug' => make_slug($request->name)
        ]);

        session()->flash('success', __('Donation category added successfully') . '!');

        return 'success';
    }

    public function destroy(Request $request)
    {

        $id = $request->category_id;
        $category = DonationCategories::where('user_id', Auth::guard('web')->user()->id)->findOrFail($id);
        if ($category->donations()->where('user_id', Auth::guard('web')->user()->id)->count() > 0) {
            return redirect()->back()->with('warning', 'First delete all the causes under to this category!');
        } else {
            $category->delete();
            @unlink(public_path(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $category->image));
            return redirect()->back()->with('success', __('Cause Category deleted successfully') . '!');
        }
    }
    public function bulkDestroy(Request $request)
    {
        $ids = $request->ids;
        $errorOccured = false;
        foreach ($ids as $id) {
            $category = DonationCategories::where('user_id', Auth::guard('web')->user()->id)->find($id);
            $courseCount = $category->donations()->where('user_id', Auth::guard('web')->user()->id)->count();
            if ($courseCount > 0) {
                $errorOccured = true;
                break;
            } else {
                $category->delete();
                @unlink(public_path(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $category->image));
            }
        }
        if ($errorOccured == true) {
            session()->flash('warning', __('First delete all the cause under to this categories') . '!');
        } else {
            session()->flash('success', __('Cause categories deleted successfully') . '!');
        }

        return "success";
    }
}
