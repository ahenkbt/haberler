<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\BasicSetting;
use App\Models\User\Language;
use App\Models\User\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Purifier;
use Validator;

class ServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $user = Auth::guard('web')->user();
        
        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        $data = null;
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $data['services'] = UserService::where([
            ['lang_id', '=', $lang->id],
            ['user_id', '=', $user->id],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.service.index', $data);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @return
     */
    public function store(Request $request)
    {
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'name' => 'required|max:255',
            'user_language_id' => 'required',
            'detail_page' => 'required',
            'serial_number' => 'required|integer',
            'image' => [
                'sometimes',
                'required',
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $userBs = BasicSetting::where('user_id', Auth::guard('web')->id())->select('theme')->first();
        if ($userBs->theme == 'home_seven' || $userBs->theme == 'home_nine') {
            $rules['icon'] = 'required';
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        if (!isset($request->featured)) $request["featured"] = "0";
        $input = $request->all();
        $slug = make_slug($request->name);
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $input['lang_id'] = $request->user_language_id;
        $input['icon'] = $request->icon;

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/services/');
            if (!file_exists($directory)) mkdir($directory, 0775, true);
            $request->file('image')->move($directory, $filename);
            $input['image'] = $filename;
        }
        $input['content'] = Purifier::clean($request->content);
        $blog = new UserService();
        $blog->create($input);

        Session::flash('success', __('Service added successfully') . '!');
        return "success";
    }

    /**
     * Display the specified resource.
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param int $id
     * @return
     */
    public function edit($id)
    {
        $data['service'] = UserService::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.service.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request)
    {
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'name' => 'required|max:255',
            'detail_page' => 'required',
            'serial_number' => 'required|integer',
            'image' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $service = UserService::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        $input = $request->all();
        $slug = make_slug($request->name);
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $input['icon'] = $request->icon;

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $request->file('image')->move(public_path('assets/front/img/user/services/'), $filename);
            if (file_exists(public_path('assets/front/img/user/services/' . $service->image))) {
                @unlink(public_path('assets/front/img/user/services/' . $service->image));
            }

            $input['image'] = $filename;
        }
        $input['content'] = Purifier::clean($request->content);
        $service->update($input);
        Session::flash('success', __('Service updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function delete(Request $request)
    {
        $service = UserService::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        if (file_exists(public_path('assets/front/img/user/services/' . $service->image))) {
            @unlink(public_path('assets/front/img/user/services/' . $service->image));
        }
        $service->delete();
        Session::flash('success', __('Service deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $service = UserService::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            if (file_exists(public_path('assets/front/img/user/services/' . $service->image))) {
                @unlink(public_path('assets/front/img/user/services/' . $service->image));
            }
            $service->delete();
        }
        Session::flash('success', __('Service deleted successfully') . '!');
        return "success";
    }

    public function featured(Request $request): \Illuminate\Http\RedirectResponse
    {
        $member = UserService::where('user_id', Auth::user()->id)->where('id', $request->service_id)->firstOrFail();
        $member->featured = $request->featured;
        $member->save();
        if ($request->featured == 1) {
            Session::flash('success', __('Featured successfully') . '!');
        } else {
            Session::flash('success', __('Unfeatured successfully') . '!');
        }
        return back();
    }
}
