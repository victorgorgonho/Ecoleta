import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {
    async index(req: Request, res: Response){
        const { city, uf, items } = req.query;

        if(city || uf || items){
            const parsedItems = String(items)
                .split(',')
                .map(item => Number(item.trim()));
        
            const points = await knex('points')
                .join('point_items', 'points.id', '=', 'point_items.point_id')
                .whereIn('point_items.item_id', parsedItems)
                .where('city', String(city))
                .where('uf', String(uf))
                .distinct()
                .select('points.*');

            const serializedPoints = points.map(point => {
                return { 
                    ...point,
                    image_url: `http://192.168.1.106:3333/uploads/${point.image}`,
                };
            });
                
            return res.json(serializedPoints);
        }else{
            const points = await knex('points')
                .join('point_items', 'points.id', '=', 'point_items.point_id')
                .distinct()
                .select('points.*');
                
            return res.json(points);
        }
    }

    async show(req: Request, res: Response) {
        const { id } = req.params;

        const point = await knex('points').where('id', id).first();

        if(!point){
            return res.status(400).json({ message: 'Point not found.'});
        }

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        const serializedPoint = {
            ...point,
            image_url: `http://192.168.1.106:3333/uploads/${point.image}`
        };

        return res.json({serializedPoint, items});
    }

    async create(req: Request, res: Response) {
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = req.body;
    
        const trx = await knex.transaction();

        const point = {
            image: req.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };
    
        const insertedIds = await trx('points').insert(point);
    
        const point_id = insertedIds[0];
    
        const pointItems = items
            .split(',')
            .map((item: string) => Number(item.trim()))
            .map((item_id: number) => {
            return {
                item_id,
                point_id
            };
        })
    
        await trx('point_items').insert(pointItems);

        await trx.commit();
    
        return res.json({
            id: point_id,
            ...point
        });
    }

    async destroy(req: Request, res: Response) {
        const { id } = req.params;

        const point = await knex('points')
            .where('id', id)
            .delete();

        if(!point){
            return res.status(404).json({ error: 'Point not found' });
        }

        const items = await knex('point_items')
            .where('point_items.point_id', id)
            .delete();

        if(!items){
            return res.status(404).json({ error: 'Point_items not found' });
        }

        return res.json({ok: true});
    }
}

export default PointsController;