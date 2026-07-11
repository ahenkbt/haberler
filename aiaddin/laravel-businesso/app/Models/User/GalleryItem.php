<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class GalleryItem extends Model
{
    use HasFactory;
    protected $table = 'user_gallery_items';
    protected $fillable = [
        'language_id',
        'user_id',
        'gallery_category_id',
        'item_type',
        'image',
        'video_link',
        'title',
        'serial_number',
        'is_featured'
    ];

    public function itemLang()
    {
        return $this->belongsTo(Language::class)->where('user_id', Auth::id());
    }

    public function itemCategory()
    {
        return $this->belongsTo(GalleryCategory::class, 'gallery_category_id', 'id');
    }
}
