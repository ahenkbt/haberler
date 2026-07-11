<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class GalleryCategory extends Model
{
    use HasFactory;
    protected $table = 'user_gallery_categories';
    protected $fillable = ['language_id', 'user_id', 'name', 'status', 'serial_number'];

    public function categoryLang()
    {
        return $this->belongsTo(Language::class)->where('user_id', Auth::id());
    }

    public function imgVid()
    {
        return $this->hasMany(GalleryItem::class)->where('user_id', Auth::id());
    }
}
