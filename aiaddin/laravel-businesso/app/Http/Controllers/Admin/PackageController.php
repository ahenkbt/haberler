<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Package\PackageStoreRequest;
use App\Http\Requests\Package\PackageUpdateRequest;
use App\Models\BasicExtended;
use App\Models\Language;
use App\Models\Package;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class PackageController extends Controller
{
    public function settings()
    {
        $data['abe'] = BasicExtended::first();
        return view('admin.packages.settings', $data);
    }

    public function updateSettings(Request $request)
    {
        $validatedData = $request->validate([
            'expiration_reminder' => 'required|integer|min:1|max:365'
        ]);
        
        $be = BasicExtended::first();
        // $be->expiration_reminder = $request->expiration_reminder;
        $be->expiration_reminder = $validatedData['expiration_reminder'];
        $be->save();

        Session::flash('success', __('Settings updated successfully!'));
        return back();
    }
    public function features()
    {
        $be = BasicExtended::first();
        $features = json_decode($be->package_features, true);
        $data['features'] = $features;
        return view('admin.packages.features', $data);
    }

    public function updateFeatures(Request $request)
    {

        $features = $request->features ? json_encode($request->features) : NULL;
        $bes = BasicExtended::all();

        foreach ($bes as $key => $be) {
            $be->package_features = $features;
            $be->save();
        }

        Session::flash('success', __('Features updated successfully!'));
        return back();
    }
    /**
     * Display a listing of the resource.
     *
     *
     */
    public function index(Request $request)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $search = $request->search;
        $data['bex'] = $currentLang->basic_extended;
        $data['packages'] = Package::query()->when($search, function ($query, $search) {
            return $query->where('title', 'like', '%' . $search . '%');
        })->orderBy('created_at', 'DESC')->get();
        return view('admin.packages.index', $data);
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
     *
     */

    public function store(PackageStoreRequest $request)
    {
        try {
            if (!isset($request->featured)) {
                $request["featured"] = "0";
            }

            $featuresArr = $request->features ?? [];
            $features = json_encode($featuresArr);

            $hasAiFeature = is_array($featuresArr) && in_array('One-Click AI Website Setup', $featuresArr);

            $aiEngine = $hasAiFeature ? ($request->ai_engine ?? null) : null;
            $aiPages  = $hasAiFeature ? json_encode($request->ai_pages ?? []) : null;
            $aiLimit  = $hasAiFeature ? ($request->ai_generate_limit ?? null) : null;

            return DB::transaction(function () use ($request, $features, $aiEngine, $aiPages, $aiLimit) {

                $data = $request->except([
                    'features',
                    'ai_engine',
                    'ai_pages',
                    'ai_generate_limit',
                ]);

                $data = array_merge($data, [
                    'slug' => make_slug($request->title),
                    'features' => $features,
                    'ai_engine' => $aiEngine,
                    'ai_pages' => $aiPages,
                    'ai_generate_limit' => $aiLimit,
                ]);

                Package::create($data);

                Session::flash('success', __("Package Created Successfully"));
                return "success";
            });
        } catch (\Throwable $e) {
            dd($e);
            return $e;
        }
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
        try {
            if (session()->has('lang')) {
                $currentLang = Language::where('code', session()->get('lang'))->first();
            } else {
                $currentLang = Language::where('is_default', 1)->first();
            }
            $data['bex'] = $currentLang->basic_extended;
            $data['package'] = Package::query()->findOrFail($id);
            return view("admin.packages.edit", $data);
        } catch (ModelNotFoundException $e) {
            return $e;
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param int $id
     *
     */

    public function update(PackageUpdateRequest $request)
    {
        try {
            // Trial handling
            if (!array_key_exists('is_trial', $request->all())) {
                $request['is_trial'] = "0";
                $request['trial_days'] = 0;
            }

            // Featured handling
            if (!isset($request->featured)) {
                $request['featured'] = "0";
            }

            // Features
            $featuresArr = $request->features ?? [];
            $features = json_encode($featuresArr);

            // Check AI feature
            $hasAiFeature = is_array($featuresArr) && in_array('One-Click AI Website Setup', $featuresArr);

            // AI fields
            $aiEngine = $hasAiFeature ? ($request->ai_engine ?? null) : null;
            $aiPages  = $hasAiFeature ? json_encode($request->ai_pages ?? []) : null;
            $aiLimit  = $hasAiFeature ? ($request->ai_generate_limit ?? null) : null;

            return DB::transaction(function () use ($request, $features, $aiEngine, $aiPages, $aiLimit) {

                $data = $request->except([
                    'features',
                    'ai_engine',
                    'ai_pages',
                    'ai_generate_limit',
                ]);

                $data = array_merge($data, [
                    'slug' => make_slug($request->title),
                    'features' => $features,

                    'ai_engine' => $aiEngine,
                    'ai_pages' => $aiPages,
                    'ai_generate_limit' => $aiLimit,
                ]);

                Package::query()
                    ->findOrFail($request->package_id)
                    ->update($data);

                Session::flash('success', __("Package Update Successfully"));
                return "success";
            });
        } catch (\Throwable $e) {
            return $e;
        }
    }



    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

    public function delete(Request $request)
    {
        try {
            return DB::transaction(function () use ($request) {
                $package = Package::query()->findOrFail($request->package_id);
                if ($package->memberships()->count() > 0) {
                    foreach ($package->memberships as $key => $membership) {
                        @unlink(public_path('assets/front/img/membership/receipt/' . $membership->receipt));
                        $membership->delete();
                    }
                }
                $package->delete();
                Session::flash('success', __('Package deleted successfully!'));
                return back();
            });
        } catch (\Throwable $e) {
            return $e;
        }
    }

    public function bulkDelete(Request $request)
    {
        try {
            return DB::transaction(function () use ($request) {
                $ids = $request->ids;
                foreach ($ids as $id) {
                    $package = Package::query()->findOrFail($id);
                    if ($package->memberships()->count() > 0) {
                        foreach ($package->memberships as $key => $membership) {
                            @unlink(public_path('assets/front/img/membership/receipt/' . $membership->receipt));
                            $membership->delete();
                        }
                    }
                    $package->delete();
                }
                Session::flash('success', __('Package bulk deletion is successful!'));
                return "success";
            });
        } catch (\Throwable $e) {
            return $e;
        }
    }
}
