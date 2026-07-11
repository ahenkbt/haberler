<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\Education;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class EducationController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     *
     */
    public function index(Request $request)
    {
        if ($request->has('language')) {
            $lang = Language::where([
                ['code', $request->language],
                ['user_id', Auth::id()]
            ])->first();
        } else {
            $lang = Language::where([
                ['dashboard_default', 1],
                ['user_id', Auth::id()]
            ])
                ->first();
        }
        $data['educations'] = Education::query()
            ->where('language_id', $lang->id)
            ->where('user_id', Auth::id())
            ->get();
        return view('user.user_education.index', $data);
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
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {

        $slug = make_slug($request->degree_name);
        $rules = [
            'user_language_id' => 'required',
            'degree_name' => 'required|max:255',
            'serial_number' => 'required|integer'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $input['language_id'] = $request->user_language_id;
        $input['short_description'] = Purifier::clean($request->short_description);
        $education = new Education();
        $education->create($input);

        Session::flash('success', __('Education added successfully') . '!');
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
        $data['education'] = Education::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.user_education.edit', $data);
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
        $slug = make_slug($request->degree_name);

        $rules = [
            'degree_name' => 'required|max:255',
            'serial_number' => 'required|integer'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $education = Education::findOrFail($request->id);
        if ($education->user_id != Auth::user()->id) {
            return;
        }
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $input['short_description'] = Purifier::clean($request->short_description);
        $education->update($input);
        Session::flash('success', __('Education updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        $education = Education::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        $education->delete();
        Session::flash('success', __('Education deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $education = Education::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            $education->delete();
        }
        Session::flash('success', __('Education deleted successfully') . '!');
        return "success";
    }
}
