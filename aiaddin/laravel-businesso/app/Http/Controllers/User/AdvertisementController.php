<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Models\User\UserAdvertisement;
use Illuminate\Support\Facades\Auth;

class AdvertisementController extends Controller
{
    public function index()
    {
        $ads = UserAdvertisement::where('user_id', Auth::guard('web')->user()->id)->orderBy('id', 'desc')->get();
        
        return view('user.advertisement.index', compact('ads'));
    }

    public function settings()
    {
        $data = BasicSetting::where('user_id', Auth::guard('web')->user()->id)
            ->select('adsense_publisher_id')
            ->first();
        return view('user.advertisement.settings', compact('data'));
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'adsense_publisher_id' => 'required'
        ]);
        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(['adsense_publisher_id' => $request->adsense_publisher_id]);
        $request->session()->flash('success', __('Settings updated successfully') . '!');
        return back();
    }
    public function store(Request $request)
    {
        $request->validate([
            'url' => 'required_if:ad_type,==,banner',
            'ad_slot' => 'required_if:ad_type,==,script',
            'image' => 'required_if:ad_type,==,banner|mimes:jpeg,jpg,png,svg,gif'
        ]);
        if ($request->hasFile('image')) {
            // get image extension
            $imageURL = $request->image;
            $fileExtension = $imageURL->extension();
            // set a name for the image and store it to local storage
            $imageName = time() . '.' . $fileExtension;
            $directory = './assets/front/img/user/advertisements/';
            @mkdir($directory, 0775, true);
            @copy($imageURL, $directory . $imageName);
        }
        UserAdvertisement::create($request->except('image', 'ad_slot') + [
            'image' => $request->hasFile('image') ? $imageName : null,
            'ad_slot' => $request->filled('ad_slot') ? $request->ad_slot : null,
            'user_id' => Auth::guard('web')->user()->id
        ]);
        $request->session()->flash('success', __('New advertisement added successfully') . '!');
        return 'success';
    }
    public function update(Request $request)
    {
        $ad = UserAdvertisement::find($request->id);
        $request->validate([
            'url' => 'required_if:ad_type,==,banner',
            'ad_slot' => 'required_if:ad_type,==,script'
        ]);
        if ($request->hasFile('image') || $request->ad_type === 'script') {
            // first, delete the previous image from local storage
            @unlink(public_path('/assets/front/img/user/advertisements/' . $ad->image));
        }
        if ($request->hasFile('image')) {
            // get image extension
            $imageURL = $request->image;
            $fileExtension = $imageURL->extension();
            // set a name for the image and store it to local storage
            $imageName = time() . '.' . $fileExtension;
            $directory = public_path('assets/front/img/user/advertisements/');

            @copy($imageURL, $directory . $imageName);
        }
        $ad->update($request->except('image', 'script') + [
            'image' => $request->hasFile('image') ? $imageName : $ad->image,
            'ad_slot' => $request->filled('ad_slot') ? $request->ad_slot : $ad->ad_slot
        ]);
        $request->session()->flash('success', __('Advertisement updated successfully') . '!');
        return 'success';
    }
    public function destroy($id)
    {
        $ad = UserAdvertisement::find($id);
        if ($ad->ad_type == 'banner') {
            @unlink(public_path('assets/front/img/user/advertisements/' . $ad->image));
        }
        $ad->delete();
        return redirect()->back()->with('success', __('Advertisement deleted successfully') . '!');
    }
    public function bulkDestroy(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $ad = UserAdvertisement::find($id);
            if ($ad->ad_type == 'banner') {
                @unlink(public_path('assets/front/img/user/advertisements/' . $ad->image));
            }
            $ad->delete();
        }
        $request->session()->flash('success', __('Advertisements deleted successfully') . '!');
        return 'success';
    }
}
