<?php

namespace App\Http\Helpers;

use Illuminate\Support\Facades\Auth;
// use getId3;

class Uploader
{
    public static function upload_picture($directory, $img): string
    {
        $file_name = sha1(time() . rand());
        $directory = public_path($directory);
        if (!file_exists($directory)) {
            if (!mkdir($directory, 0775, true)) { //0777
                die('Failed to create folders...');
            }
        }
        $ext = $img->getClientOriginalExtension();
        $newFileName = $file_name . "." . $ext;
        $img->move($directory, $newFileName);
        return $newFileName;
    }
    
    public static function update_picture($directory, $img, $old_img): string
    {
        $file_name = sha1(time() . rand());
        $directory = public_path($directory);
        if (!file_exists($directory)) {
            if (!mkdir($directory, 0775, true)) { //0777
                die('Failed to create folders...');
            }
        }
        $ext = $img->getClientOriginalExtension();
        $newFileName = $file_name . "." . $ext;
        $oldImgPath = $directory . '/' . $old_img;
        if (file_exists($oldImgPath)) @unlink($oldImgPath);
        $img->move($directory, $newFileName);
        return $newFileName;
    }

    public static function upload_file($directory, $file, $user_id = null)
    {
        $user_id = $user_id ?? Auth::guard('web')->user()->id;

        $file_name = sha1(time() . rand());
        $originalName = $file->getClientOriginalName();
        $ext = $file->getClientOriginalExtension();
        $newFileName = $file_name . "." . $ext;

        $directory = public_path($directory);

        if (!file_exists($directory)) {
            if (!mkdir($directory, 0755, true)) {
                die('Failed to create folders...');
            }
        }

        $file->move($directory, $newFileName);
        return [
            'originalName' => $originalName,
            'uniqueName' => $newFileName
        ];
    }
    public static function remove($directory, $filename): void
    {
        $pathToFile = $directory . '/' . $filename;
        $pathToFile = public_path($pathToFile);
        if (file_exists($pathToFile)) {
            @unlink($pathToFile);
        }
    }

    public static function upload_video($directory, $file, $user_id = null)
    {
        $user_id = $user_id ?? Auth::guard('web')->user()->id;

        $file_name = sha1(time() . rand());
        $originalName = $file->getClientOriginalName();
        $ext = $file->getClientOriginalExtension();
        $newFileName = $file_name . "." . $ext;

        $directory = public_path($directory);
        if (!file_exists($directory)) {
            if (!mkdir($directory, 0755, true)) {
                die('Failed to create folders...');
            }
        }
        // dd('ok');
        $file->move($directory, $newFileName);
        // get video duration after the video upload
        $getID3 = new \getID3;
        $fileInfo = $getID3->analyze($directory . '/' . $newFileName);
        if (isset($fileInfo['playtime_seconds'])) {
            $duration = gmdate('H:i:s', $fileInfo['playtime_seconds']);
        } else {
            $duration = '';
        }
        return [
            'originalName' => $originalName,
            'uniqueName' => $newFileName,
            'duration' => $duration
        ];
    }

    public static function downloadFile($directory, $file_unique_name, $originalName, $bs)
    {
        $pathToFile = $directory . '/' . $file_unique_name;

        $pathToFile = public_path($pathToFile);
        return response()->download($pathToFile, $originalName);
    }
}
